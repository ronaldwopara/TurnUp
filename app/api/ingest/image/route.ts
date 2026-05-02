import { badRequest, ok } from "@/lib/api/http";
import { imageBase64BodySchema } from "@/lib/api/schemas";
import { ingestImageFlow } from "@/lib/services/ingestService";

export const runtime = "nodejs";

const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 512 * 1024 * 1024;

function normalizeMimeType(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === "image/jpg") {
    return "image/jpeg";
  }
  return normalized;
}

function inferMimeTypeFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  if (lower.endsWith(".gif")) {
    return "image/gif";
  }
  return null;
}

function isSupportedImageMimeType(mimeType: string): boolean {
  return SUPPORTED_IMAGE_MIME_TYPES.has(normalizeMimeType(mimeType));
}

async function parseImageRequest(request: Request): Promise<
  | {
      userId: string;
      imageBuffer: Buffer;
      mimeType: string;
      persistDeck: boolean;
    }
  | { error: string }
> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    const userId = String(formData.get("userId") ?? "demo-user");
    const persistDeckRaw = String(formData.get("persistDeck") ?? "true").toLowerCase();
    const persistDeck = persistDeckRaw !== "false" && persistDeckRaw !== "0";

    if (!(file instanceof File)) {
      return { error: "Expected a file upload for image ingest." };
    }

    const mimeType = normalizeMimeType(file.type || inferMimeTypeFromFilename(file.name) || "");
    if (!isSupportedImageMimeType(mimeType)) {
      return { error: "Unsupported image type. Use PNG, JPEG, WEBP, or GIF." };
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return { error: "Image is too large. Maximum supported size is 512MB." };
    }

    const arrayBuffer = await file.arrayBuffer();
    return {
      userId,
      imageBuffer: Buffer.from(arrayBuffer),
      mimeType,
      persistDeck,
    };
  }

  const json = await request.json();
  const parsed = imageBase64BodySchema.safeParse(json);
  if (!parsed.success) {
    return { error: "Expected multipart file upload or base64 payload." };
  }

  const mimeType = normalizeMimeType(parsed.data.mimeType);
  if (!isSupportedImageMimeType(mimeType)) {
    return { error: "Unsupported image type. Use PNG, JPEG, WEBP, or GIF." };
  }

  const imageBuffer = Buffer.from(parsed.data.base64Image, "base64");
  if (imageBuffer.length > MAX_IMAGE_BYTES) {
    return { error: "Image is too large. Maximum supported size is 512MB." };
  }

  return {
    userId: parsed.data.userId ?? "demo-user",
    imageBuffer,
    mimeType,
    persistDeck: parsed.data.persistDeck,
  };
}

export async function POST(request: Request) {
  const parsed = await parseImageRequest(request);
  if ("error" in parsed) {
    return badRequest(parsed.error);
  }

  if (parsed.imageBuffer.length === 0) {
    return badRequest("Image payload is empty.");
  }

  const response = await ingestImageFlow(parsed);
  return ok(response);
}
