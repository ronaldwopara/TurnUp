import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import type { PNGWithMetadata } from "pngjs";

export interface RgbaImageInput {
  width: number;
  height: number;
  data: Uint8Array;
}

function pngToRgba(png: PNGWithMetadata): RgbaImageInput {
  const { width, height, data, colorType, depth } = png;
  if (depth !== 8) {
    throw new Error(`Unsupported PNG bit depth (${depth}); use 8-bit PNG for OCR.`);
  }
  const n = width * height;
  const out = new Uint8Array(n * 4);
  const src = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  if (colorType === 6) {
    out.set(src.subarray(0, n * 4));
    return { width, height, data: out };
  }
  if (colorType === 2) {
    for (let i = 0; i < n; i++) {
      const si = i * 3;
      const di = i * 4;
      out[di] = src[si]!;
      out[di + 1] = src[si + 1]!;
      out[di + 2] = src[si + 2]!;
      out[di + 3] = 255;
    }
    return { width, height, data: out };
  }
  if (colorType === 0) {
    for (let i = 0; i < n; i++) {
      const g = src[i]!;
      const di = i * 4;
      out[di] = g;
      out[di + 1] = g;
      out[di + 2] = g;
      out[di + 3] = 255;
    }
    return { width, height, data: out };
  }
  if (colorType === 4) {
    for (let i = 0; i < n; i++) {
      const si = i * 2;
      const g = src[si]!;
      const a = src[si + 1]!;
      const di = i * 4;
      out[di] = g;
      out[di + 1] = g;
      out[di + 2] = g;
      out[di + 3] = a;
    }
    return { width, height, data: out };
  }
  throw new Error(`Unsupported PNG color type (${colorType}) for OCR.`);
}

/** Decode PNG or JPEG bytes to RGBA `ImageInput` for PaddleOCR. */
export function decodeImageBufferToRgba(buffer: Buffer): RgbaImageInput {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
    return {
      width: decoded.width,
      height: decoded.height,
      data: new Uint8Array(decoded.data),
    };
  }
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer.toString("ascii", 1, 4) === "PNG") {
    const png = PNG.sync.read(buffer);
    return pngToRgba(png);
  }
  throw new Error("Unsupported image format for OCR (use PNG or JPEG).");
}
