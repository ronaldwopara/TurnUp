import { badRequest, ok } from "@/lib/api/http";
import { socialLinkBodySchema } from "@/lib/api/schemas";
import { ingestLinkFlow } from "@/lib/services/ingestService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = socialLinkBodySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid social link payload.", parsed.error.flatten());
  }

  const response = await ingestLinkFlow({
    userId: parsed.data.userId ?? "demo-user",
    url: parsed.data.url,
  });
  return ok(response);
}
