import { fetchRemoteImageBuffer, isHttpImageUrl } from "@/lib/remote-image";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url || !isHttpImageUrl(url)) {
    return new Response("Invalid image URL", { status: 400 });
  }

  const fetched = await fetchRemoteImageBuffer(url);
  if (!fetched) {
    return new Response("Image unavailable", { status: 404 });
  }

  return new Response(new Uint8Array(fetched.buffer), {
    status: 200,
    headers: {
      "Content-Type": fetched.contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
