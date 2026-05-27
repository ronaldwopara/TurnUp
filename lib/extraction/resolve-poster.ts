import { fetchFirstValidatedPosterDataUrl } from "@/lib/extraction/poster-image";
import { fetchMicrolinkImage } from "@/lib/extraction/microlink";
import { fetchPeekalinkPosterDataUrl } from "@/lib/extraction/peekalink";
import { getSocialMediaContent } from "@/lib/extraction/social";

/** Post-time poster resolution: Peekalink → OG/ingest → Microlink. Returns data URL or null. */
export async function resolvePosterFromSourceUrl(sourceUrl: string): Promise<string | null> {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    return null;
  }

  const fromPeekalink = await fetchPeekalinkPosterDataUrl(trimmed);
  if (fromPeekalink) {
    return fromPeekalink;
  }

  try {
    const social = await getSocialMediaContent({ url: trimmed });
    const candidates: string[] = [];
    if (social.mediaUrl?.trim()) {
      candidates.push(social.mediaUrl.trim());
    }
    const raw = social.providerRaw as { image?: string; images?: string[] } | undefined;
    if (raw?.image) candidates.push(raw.image);
    if (Array.isArray(raw?.images)) {
      candidates.push(...raw.images);
    }

    const fromOg = await fetchFirstValidatedPosterDataUrl(candidates);
    if (fromOg) {
      return fromOg;
    }
  } catch {
    // fall through to Microlink
  }

  return await fetchMicrolinkImage(trimmed);
}
