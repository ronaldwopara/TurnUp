const MIN_POSTER_BYTES = 20_000;
const MAX_POSTER_BYTES = 4 * 1024 * 1024;

const REJECTED_URL_PATTERN = /static\.cdninstagram\.com\/rsrc\.php/i;
const FEED_CROP_PATTERN = /s640x640|best_image_urlgen|c\d+\.\d+\.\d+\.\d+a/i;

/** Instagram feed/link-card crops — avoid persisting these when a better URL exists. */
export function isLowQualityInstagramPosterUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (REJECTED_URL_PATTERN.test(lower)) return true;
  return FEED_CROP_PATTERN.test(lower);
}

function posterUrlQualityScore(url: string): number {
  let score = 0;
  const lower = url.toLowerCase();
  if (/regular_photo|xpids/i.test(lower)) score += 20;
  if (/fbcdn\.net/i.test(lower)) score += 5;
  if (/scontent/i.test(lower)) score += 3;
  if (!isLowQualityInstagramPosterUrl(url)) score += 10;
  if (/stp=dst-jpg/i.test(lower) && !FEED_CROP_PATTERN.test(lower)) score += 4;
  return score;
}

/** Prefer full poster URLs; never mutate query params (signatures break). */
export function rankPosterImageUrls(urls: Iterable<string>): string[] {
  const unique = new Set<string>();
  for (const raw of urls) {
    const trimmed = raw.trim();
    if (trimmed && /^https?:\/\//i.test(trimmed) && !isRejectedPosterUrl(trimmed)) {
      unique.add(trimmed);
    }
  }
  return [...unique].sort((a, b) => posterUrlQualityScore(b) - posterUrlQualityScore(a));
}

export function isRejectedPosterUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
    return true;
  }
  return REJECTED_URL_PATTERN.test(trimmed);
}

function normalizeImageMimeType(contentType: string): string {
  const base = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (base === "image/jpg") return "image/jpeg";
  return base;
}

/** Download remote image URL (exact URL only) and return a validated data URL, or null. */
export async function fetchValidatedPosterDataUrl(imageUrl: string): Promise<string | null> {
  if (isRejectedPosterUrl(imageUrl)) {
    return null;
  }

  try {
    const response = await fetch(imageUrl.trim(), {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/*,*/*;q=0.8",
        Referer: "https://www.instagram.com/",
      },
    });

    if (!response.ok) {
      return null;
    }

    const contentType = normalizeImageMimeType(response.headers.get("content-type") ?? "");
    if (!contentType.startsWith("image/")) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (
      arrayBuffer.byteLength < MIN_POSTER_BYTES ||
      arrayBuffer.byteLength > MAX_POSTER_BYTES
    ) {
      return null;
    }

    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

/** Try ranked poster URLs (high quality first, then fallbacks). */
export async function fetchFirstValidatedPosterDataUrl(urls: string[]): Promise<string | null> {
  const ranked = rankPosterImageUrls(urls);
  const highQuality = ranked.filter((u) => !isLowQualityInstagramPosterUrl(u));
  for (const url of highQuality) {
    const dataUrl = await fetchValidatedPosterDataUrl(url);
    if (dataUrl) return dataUrl;
  }
  for (const url of ranked) {
    const dataUrl = await fetchValidatedPosterDataUrl(url);
    if (dataUrl) return dataUrl;
  }
  return null;
}
