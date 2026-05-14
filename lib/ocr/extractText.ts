import * as ort from "onnxruntime-node";
import { PaddleOcrService } from "paddleocr";
import { decodeImageBufferToRgba } from "./decodeImageBuffer";
import { preprocessImageBuffer } from "./preprocessImage";
import { readModelBuffers } from "./paddleOcrModels";

let paddleServicePromise: Promise<PaddleOcrService> | null = null;

function getPaddleOcrService(): Promise<PaddleOcrService> {
  if (!paddleServicePromise) {
    paddleServicePromise = (async () => {
      const { detection, recognition, charactersDictionary } = await readModelBuffers();
      return PaddleOcrService.createInstance({
        ort,
        detection: { modelBuffer: detection },
        recognition: {
          modelBuffer: recognition,
          charactersDictionary,
        },
      });
    })();
  }
  return paddleServicePromise;
}

function stripNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^[|_~`'".,;:!\\/\-\s]+$/.test(trimmed)) return true;
  if (/^[^\w]{6,}$/.test(trimmed)) return true;
  return false;
}

function normalizeExtractedText(text: string): string {
  const cleanedLines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => !stripNoiseLine(line));

  return cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function toNodeBuffer(image: File | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(image)) {
    return image;
  }
  const bytes = await image.arrayBuffer();
  return Buffer.from(bytes);
}

export async function extractTextFromImage(image: File | Buffer): Promise<string> {
  const rawBuffer = await toNodeBuffer(image);
  const prepared = await preprocessImageBuffer(rawBuffer, { enable: true });

  const service = await getPaddleOcrService();
  const rgbaInput = decodeImageBufferToRgba(prepared);
  const recognition = await service.recognize(rgbaInput);
  const { text } = service.processRecognition(recognition);

  return normalizeExtractedText(text ?? "");
}
