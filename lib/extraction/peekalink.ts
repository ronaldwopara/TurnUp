import {
  fetchFirstValidatedPosterDataUrl,
  fetchValidatedPosterDataUrl,
} from "@/lib/extraction/poster-image";

type PeekalinkImageVariant = {
  url?: string;
  width?: number;
  height?: number;
};

type PeekalinkImageBlock = {
  original?: PeekalinkImageVariant;
  large?: PeekalinkImageVariant;
  medium?: PeekalinkImageVariant;
  thumbnail?: PeekalinkImageVariant;
  url?: string;
};

type PeekalinkResponse = {
  ok?: boolean;
  title?: string;
  description?: string;
  image?: PeekalinkImageBlock;
  type?: string;
};

/** Pick largest portrait-biased image URL from Peekalink response. */
export function extractPeekalinkPosterUrls(payload: PeekalinkResponse): string[] {
  const urls: string[] = [];
  const block = payload.image;
  if (!block) return urls;

  const variants = [block.original, block.large, block.medium, block.thumbnail];
  for (const variant of variants) {
    const url = variant?.url?.trim();
    if (url) urls.push(url);
  }
  if (typeof block.url === "string" && block.url.trim()) {
    urls.push(block.url.trim());
  }

  return [...new Set(urls)].sort((a, b) => {
    const score = (u: string) => {
      const variant = variants.find((v) => v?.url === u);
      const w = variant?.width ?? 0;
      const h = variant?.height ?? 0;
      const portraitBonus = h > w ? 1000 : 0;
      return portraitBonus + w * h;
    };
    return score(b) - score(a);
  });
}

/** Resolve poster via Peekalink API; returns data URL or null. */
export async function fetchPeekalinkPosterDataUrl(sourceUrl: string): Promise<string | null> {
  const apiKey = process.env.PEEKALINK_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const response = await fetch("https://api.peekalink.io/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ link: trimmed }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as PeekalinkResponse;
    if (payload.ok === false) {
      return null;
    }

    const urls = extractPeekalinkPosterUrls(payload);
    if (urls.length === 0) {
      return null;
    }

    const fromPeekalinkCdn = urls.filter((u) => u.includes("cdn.peekalink.io"));
    const directSource = urls.filter((u) => !u.includes("cdn.peekalink.io"));

    if (directSource.length > 0) {
      const dataUrl = await fetchFirstValidatedPosterDataUrl(directSource);
      if (dataUrl) return dataUrl;
    }

    for (const url of fromPeekalinkCdn) {
      const dataUrl = await fetchValidatedPosterDataUrl(url);
      if (dataUrl) return dataUrl;
    }

    return await fetchFirstValidatedPosterDataUrl(urls);
  } catch {
    return null;
  }
}
