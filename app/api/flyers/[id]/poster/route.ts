import { resolveFlyerPosterBuffer } from "@/lib/flyer-poster";
import { getFlyerById } from "@/lib/repos/flyersRepo";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const flyer = await getFlyerById(id);
  if (!flyer) {
    return new Response("Flyer not found", { status: 404 });
  }

  const poster = await resolveFlyerPosterBuffer({
    id: flyer.id,
    imageUrl: flyer.imageUrl,
    sourceUrl: flyer.sourceUrl,
  });

  if (!poster) {
    return new Response("Poster unavailable", { status: 404 });
  }

  return new Response(new Uint8Array(poster.buffer), {
    status: 200,
    headers: {
      "Content-Type": poster.contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
