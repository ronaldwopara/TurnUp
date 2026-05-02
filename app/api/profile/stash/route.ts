import { badRequest, ok } from "@/lib/api/http";
import { stashBodySchema } from "@/lib/api/schemas";
import { createStashItemOnly } from "@/lib/repos/stashRepo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = stashBodySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid stash payload.", parsed.error.flatten());
  }

  const stash = await createStashItemOnly({
    userId: parsed.data.userId ?? "demo-user",
    itemType: parsed.data.itemType,
    title: parsed.data.title,
    subtitle: parsed.data.subtitle,
    detailLabel: parsed.data.detailLabel,
    assetRef: parsed.data.assetRef,
    sourceUrl: parsed.data.sourceUrl,
  });

  return ok({
    id: stash.id,
    type: stash.itemType,
    title: stash.title,
    subtitle: stash.subtitle,
    detailLabel: stash.detailLabel,
    assetRef: stash.assetRef,
    sourceUrl: stash.sourceUrl,
    createdAt: stash.createdAt,
  });
}
