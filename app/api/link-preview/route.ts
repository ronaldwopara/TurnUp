import { badRequest, ok } from "@/lib/api/http";
import { fetchLinkPreview } from "@/lib/link-preview";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  url: z.string().url(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid URL", parsed.error.flatten());
  }

  const preview = await fetchLinkPreview(parsed.data.url);
  return ok(preview);
}
