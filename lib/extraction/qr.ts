import jpeg from "jpeg-js";
import jsQR from "jsqr";
import { PNG } from "pngjs";

function decodeImageToRgba(buffer: Buffer, mimeType: string): { data: Uint8ClampedArray; width: number; height: number } | null {
  if (mimeType === "image/png") {
    const decoded = PNG.sync.read(buffer);
    return {
      data: new Uint8ClampedArray(decoded.data),
      width: decoded.width,
      height: decoded.height,
    };
  }

  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    const decoded = jpeg.decode(buffer, { useTArray: true });
    if (!decoded?.data) {
      return null;
    }

    return {
      data: new Uint8ClampedArray(decoded.data),
      width: decoded.width,
      height: decoded.height,
    };
  }

  return null;
}

export function detectQrUrlFromImage(buffer: Buffer, mimeType: string): string | null {
  const rgba = decodeImageToRgba(buffer, mimeType);
  if (!rgba) {
    return null;
  }

  const result = jsQR(rgba.data, rgba.width, rgba.height);
  if (!result?.data) {
    return null;
  }

  const candidate = result.data.trim();
  try {
    const url = new URL(candidate);
    return url.toString();
  } catch {
    return null;
  }
}
