import { badRequest, ok } from "@/lib/api/http";
import { imageBase64BodySchema } from "@/lib/api/schemas";
import { ingestImageFlow } from "@/lib/services/ingestService";

export const runtime = "nodejs";

async function parseImageRequest(request: Request): Promise<{
  userId: string;
  imageBuffer: Buffer;
  mimeType: string;
} | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    const userId = String(formData.get("userId") ?? "demo-user");

    if (!(file instanceof File)) {
      return null;
    }

    const arrayBuffer = await file.arrayBuffer();
    return {
      userId,
      imageBuffer: Buffer.from(arrayBuffer),
      mimeType: file.type || "image/jpeg",
    };
  }

  const json = await request.json();
  const parsed = imageBase64BodySchema.safeParse(json);
  if (!parsed.success) {
    return null;
  }

  return {
    userId: parsed.data.userId ?? "demo-user",
    imageBuffer: Buffer.from(parsed.data.base64Image, "base64"),
    mimeType: parsed.data.mimeType,
  };
}

export async function POST(request: Request) {
  const parsed = await parseImageRequest(request);
  if (!parsed || parsed.imageBuffer.length === 0) {
    return badRequest("Expected multipart file upload or base64 payload.");
  }

  const response = await ingestImageFlow(parsed);
  return ok(response);
}
