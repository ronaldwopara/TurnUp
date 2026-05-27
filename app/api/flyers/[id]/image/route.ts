import { badRequest, ok, serverError } from "@/lib/api/http";
import { clientSafeErrorMessage, logServerError } from "@/lib/api/safeError";
import { db } from "@/lib/db";
import { getFlyerById } from "@/lib/repos/flyersRepo";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function normalizeMimeType(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === "image/jpg") {
    return "image/jpeg";
  }
  return normalized;
}

function inferMimeTypeFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return null;
}

function notFoundResponse() {
  return new Response("Flyer not found", { status: 404 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: flyerId } = await params;

  const flyer = await getFlyerById(flyerId);
  if (!flyer) {
    return notFoundResponse();
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return badRequest("Expected multipart/form-data with an image field.");
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return badRequest('Expected a file upload with field name "image".');
    }

    const mimeType = normalizeMimeType(file.type || inferMimeTypeFromFilename(file.name) || "");
    if (!SUPPORTED_IMAGE_MIME_TYPES.has(mimeType)) {
      return badRequest("Unsupported image type. Use PNG, JPEG, WEBP, or GIF.");
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return badRequest("Image is too large. Maximum size is 5MB.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    await db.postedFlyer.update({
      where: { id: flyerId },
      data: { imageUrl: dataUrl },
    });

    return ok({ ok: true });
  } catch (error) {
    logServerError("POST /api/flyers/[id]/image", error);
    return serverError(clientSafeErrorMessage(error, "Could not upload poster image."));
  }
}
