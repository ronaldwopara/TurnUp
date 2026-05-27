import { resolvePosterFromSourceUrl } from "@/lib/extraction/resolve-poster";

export type FlyerPosterSource = {
  id: string;
  imageUrl: string | null;
  sourceUrl: string | null;
};

function parseDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  try {
    return {
      contentType: match[1],
      buffer: Buffer.from(match[2], "base64"),
    };
  } catch {
    return null;
  }
}

/** Resolve poster bytes for browse — only from persisted data URLs. */
export async function resolveFlyerPosterBuffer(
  flyer: FlyerPosterSource,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const stored = flyer.imageUrl?.trim();
  if (stored?.startsWith("data:image/")) {
    return parseDataUrl(stored);
  }
  return null;
}

/** Resolve and validate poster at post time; returns data URL or null (never raw HTTP). */
export async function resolveFlyerImageForPost(input: {
  imageUrl?: string;
  sourceUrl?: string;
}): Promise<string | null> {
  const imageParam = input.imageUrl?.trim();
  if (imageParam?.startsWith("data:image/")) {
    return imageParam;
  }

  const source = input.sourceUrl?.trim();
  if (source) {
    return await resolvePosterFromSourceUrl(source);
  }

  return null;
}
