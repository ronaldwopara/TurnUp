const MAX_BYTES = 4 * 1024 * 1024;

export function isHttpImageUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  return /^https?:\/\//i.test(url.trim());
}

export function isDataImageUrl(url?: string | null): boolean {
  return Boolean(url?.trim().startsWith("data:image/"));
}

/** Fetch remote image bytes (server-side only). Uses the exact URL — do not strip CDN params. */
export async function fetchRemoteImageBuffer(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const response = await fetch(url.trim(), {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/*,*/*;q=0.8",
        Referer: "https://www.instagram.com/",
      },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_BYTES) return null;

    return { buffer: Buffer.from(arrayBuffer), contentType };
  } catch {
    return null;
  }
}
