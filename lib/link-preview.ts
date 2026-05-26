import { getSocialMediaContent } from "@/lib/extraction/social";

export type LinkPreview = {
  title?: string;
  description?: string;
  imageUrl?: string;
  faviconUrl?: string;
};

function faviconForUrl(sourceUrl: string): string | undefined {
  try {
    const url = new URL(sourceUrl);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=256`;
  } catch {
    return undefined;
  }
}

function parseTitleFromText(text: string): string | undefined {
  const firstLine = text.split("\n").map((line) => line.trim()).find(Boolean);
  return firstLine?.replace(/^Source URL:.*$/i, "").trim() || undefined;
}

/** Resolve a display thumbnail for Instagram, TikTok, Eventbrite, and other linked URLs. */
export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  const trimmed = url.trim();
  if (!trimmed) {
    return {};
  }

  try {
    const social = await getSocialMediaContent({ url: trimmed });
    const title = parseTitleFromText(social.text);
    const imageUrl = social.mediaUrl?.trim() || undefined;

    if (imageUrl || title) {
      return {
        title,
        description: social.text.split("\n").slice(1).join("\n").trim() || undefined,
        imageUrl,
        faviconUrl: faviconForUrl(trimmed),
      };
    }
  } catch {
    // fall through to favicon-only preview
  }

  return {
    faviconUrl: faviconForUrl(trimmed),
  };
}
