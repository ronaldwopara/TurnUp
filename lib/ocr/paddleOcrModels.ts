import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

const ASSET_BASE =
  "https://raw.githubusercontent.com/X3ZvaWQ/paddleocr.js/refs/heads/main/assets";

export const PADDLE_OCR_FILES = {
  detection: "PP-OCRv5_mobile_det_infer.onnx",
  recognition: "PP-OCRv5_mobile_rec_infer.onnx",
  dictionary: "ppocrv5_dict.txt",
} as const;

function modelDir(): string {
  return path.join(process.cwd(), ".paddleocr");
}

function assetUrl(name: string): string {
  return `${ASSET_BASE}/${name}`;
}

async function fileExistsNonEmpty(filePath: string): Promise<boolean> {
  try {
    const st = await fs.stat(filePath);
    return st.size > 0;
  } catch {
    return false;
  }
}

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  const tmp = `${destPath}.part`;
  await pipeline(
    // Node 18+ fetch body is a Web ReadableStream; cast for pipeline typing.
    res.body as unknown as NodeJS.ReadableStream,
    createWriteStream(tmp)
  );
  await fs.rename(tmp, destPath);
}

/** Ensures PP-OCRv5 ONNX models and dictionary exist under `.paddleocr/` (downloads on first use). */
export async function ensurePaddleOcrModels(): Promise<{
  detectionPath: string;
  recognitionPath: string;
  dictionaryPath: string;
}> {
  const dir = modelDir();
  await fs.mkdir(dir, { recursive: true });

  const detectionPath = path.join(dir, PADDLE_OCR_FILES.detection);
  const recognitionPath = path.join(dir, PADDLE_OCR_FILES.recognition);
  const dictionaryPath = path.join(dir, PADDLE_OCR_FILES.dictionary);

  const needDet = !(await fileExistsNonEmpty(detectionPath));
  const needRec = !(await fileExistsNonEmpty(recognitionPath));
  const needDict = !(await fileExistsNonEmpty(dictionaryPath));

  if (needDet || needRec || needDict) {
    await Promise.all([
      needDet ? downloadToFile(assetUrl(PADDLE_OCR_FILES.detection), detectionPath) : Promise.resolve(),
      needRec ? downloadToFile(assetUrl(PADDLE_OCR_FILES.recognition), recognitionPath) : Promise.resolve(),
      needDict ? downloadToFile(assetUrl(PADDLE_OCR_FILES.dictionary), dictionaryPath) : Promise.resolve(),
    ]);
  }

  return { detectionPath, recognitionPath, dictionaryPath };
}

export async function readModelBuffers(): Promise<{
  detection: ArrayBuffer;
  recognition: ArrayBuffer;
  charactersDictionary: string[];
}> {
  const { detectionPath, recognitionPath, dictionaryPath } = await ensurePaddleOcrModels();

  const [detBuf, recBuf, dictText] = await Promise.all([
    fs.readFile(detectionPath),
    fs.readFile(recognitionPath),
    fs.readFile(dictionaryPath, "utf8"),
  ]);

  const detection = detBuf.buffer.slice(detBuf.byteOffset, detBuf.byteOffset + detBuf.byteLength);
  const recognition = recBuf.buffer.slice(recBuf.byteOffset, recBuf.byteOffset + recBuf.byteLength);
  const charactersDictionary = dictText.split(/\r?\n/);

  return { detection, recognition, charactersDictionary };
}
