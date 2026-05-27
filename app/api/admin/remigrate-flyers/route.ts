import { resolveFlyerImageForPost } from "@/lib/flyer-poster";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/** Dev backfill: re-resolve poster images (OG first, then Microlink) for flyers without data URLs. */
export async function GET() {
  const flyers = await db.postedFlyer.findMany({
    where: {
      sourceUrl: { not: null },
      OR: [{ imageUrl: null }, { NOT: { imageUrl: { startsWith: "data:image/" } } }],
    },
    select: { id: true, sourceUrl: true, imageUrl: true },
  });

  const results: { id: string; ok: boolean; error?: string }[] = [];
  let updated = 0;
  let failed = 0;

  for (const flyer of flyers) {
    const sourceUrl = flyer.sourceUrl?.trim();
    if (!sourceUrl) {
      results.push({ id: flyer.id, ok: false, error: "missing sourceUrl" });
      failed += 1;
      continue;
    }

    console.log(`[remigrate-flyers] ${flyer.id} source=${sourceUrl}`);

    try {
      const dataUrl = await resolveFlyerImageForPost({ sourceUrl });
      if (!dataUrl) {
        console.log(`[remigrate-flyers] ${flyer.id} failed: no poster resolved`);
        results.push({ id: flyer.id, ok: false, error: "no poster resolved" });
        failed += 1;
        continue;
      }

      await db.postedFlyer.update({
        where: { id: flyer.id },
        data: { imageUrl: dataUrl },
      });

      console.log(`[remigrate-flyers] ${flyer.id} updated`);
      results.push({ id: flyer.id, ok: true });
      updated += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.log(`[remigrate-flyers] ${flyer.id} error: ${message}`);
      results.push({ id: flyer.id, ok: false, error: message });
      failed += 1;
    }
  }

  return Response.json({
    processed: flyers.length,
    updated,
    failed,
    results,
  });
}
