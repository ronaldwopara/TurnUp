/**
 * Image URL helpers for browse cards and event detail.
 */

export function getImageUrlCandidates(url?: string | null): string[] {
  const original = url?.trim();
  if (!original) return [];
  if (original.startsWith("data:")) return [original];
  return [original];
}

/** Client-safe src: data URLs pass through; remote URLs use same-origin proxy. */
export function toDisplayImageSrc(url: string): string {
  if (url.startsWith("data:") || url.startsWith("/")) return url;
  if (/^https?:\/\//i.test(url)) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function getDisplayImageCandidates(url?: string | null, flyerId?: string): string[] {
  if (flyerId) {
    if (url?.startsWith("data:")) return [url];
    return [`/api/flyers/${flyerId}/poster`];
  }
  return getImageUrlCandidates(url).map(toDisplayImageSrc);
}
