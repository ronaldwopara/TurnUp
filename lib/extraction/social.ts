export type SocialExtractionInput = {
  url: string;
};

export type SocialExtractionOutput = {
  text: string;
  mediaUrl?: string;
  providerRaw?: unknown;
};

const DEFAULT_COBALT_ENDPOINT = "https://api.cobalt.tools/";

function decodeHtml(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseMetaAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z_:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(tag)) !== null) {
    const key = match[1]?.toLowerCase();
    const value = match[3] ?? match[4] ?? "";
    if (key) {
      attrs[key] = decodeHtml(value.trim());
    }
  }
  return attrs;
}

function buildMetaMap(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const metaTags = html.match(/<meta[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const attrs = parseMetaAttributes(tag);
    const key = (attrs.property ?? attrs.name)?.toLowerCase();
    const content = attrs.content;
    if (key && content && !map.has(key)) {
      map.set(key, content);
    }
  }
  return map;
}

function extractMetaContent(metaMap: Map<string, string>, key: string): string | undefined {
  return metaMap.get(key.toLowerCase());
}

function extractFirstUrlNearToken(html: string, token: string): string | undefined {
  const lower = html.toLowerCase();
  const tokenLower = token.toLowerCase();
  let searchFrom = 0;

  while (searchFrom < lower.length) {
    const index = lower.indexOf(tokenLower, searchFrom);
    if (index < 0) {
      return undefined;
    }

    const start = Math.max(0, index - 240);
    const end = Math.min(html.length, index + 2600);
    const snippet = html.slice(start, end);
    const rawUrl =
      snippet.match(/https?:\/\/[^"'<>\\\s]+/i)?.[0] ??
      snippet.match(/https?:\\\/\\\/[^"'<>\\\s]+/i)?.[0]?.replace(/\\\//g, "/");
    if (rawUrl) {
      return decodeHtml(rawUrl);
    }

    searchFrom = index + tokenLower.length;
  }

  return undefined;
}

function extractHtmlTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (!match) {
    return undefined;
  }
  const cleaned = decodeHtml(match.replace(/\s+/g, " ").trim());
  return cleaned || undefined;
}

async function getOpenGraphFallback(
  url: string
): Promise<{ text: string; mediaUrl?: string; providerRaw?: unknown } | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const metaMap = buildMetaMap(html);
    const title =
      extractMetaContent(metaMap, "og:title") ??
      extractMetaContent(metaMap, "twitter:title") ??
      extractHtmlTitle(html);
    const description =
      extractMetaContent(metaMap, "og:description") ?? extractMetaContent(metaMap, "twitter:description");
    const image =
      extractMetaContent(metaMap, "og:image") ??
      extractMetaContent(metaMap, "og:image:secure_url") ??
      extractMetaContent(metaMap, "twitter:image") ??
      extractFirstUrlNearToken(html, "og:image");
    const text = [title, description, `Source URL: ${url}`].filter(Boolean).join("\n");

    if (!text && !image) {
      return null;
    }

    return {
      text: text || `Social link submitted: ${url}`,
      mediaUrl: image,
      providerRaw: {
        provider: "open-graph-fallback",
        title,
        description,
        image,
      },
    };
  } catch {
    return null;
  }
}

export async function getSocialMediaContent(
  input: SocialExtractionInput
): Promise<SocialExtractionOutput> {
  const endpoint = process.env.COBALT_API_URL ?? DEFAULT_COBALT_ENDPOINT;
  const apiKey = process.env.COBALT_API_KEY;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Api-Key ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        url: input.url,
        filenameStyle: "classic",
        downloadMode: "auto",
      }),
    });

    const payload = (await response.json()) as {
      text?: string;
      status?: string;
      url?: string;
      picker?: Array<{ type?: string; url?: string }>;
      error?: {
        code?: string;
        context?: {
          service?: string;
          limit?: number;
        };
      };
      [key: string]: unknown;
    };

    if (response.ok && payload.status !== "error") {
      const mediaUrl = payload.url ?? payload.picker?.[0]?.url;
      const textFromProvider = payload.text ?? "";
      if (mediaUrl || textFromProvider) {
        return {
          text: [textFromProvider, `Source URL: ${input.url}`].filter(Boolean).join("\n"),
          mediaUrl,
          providerRaw: payload,
        };
      }
    }

    const ogFallback = await getOpenGraphFallback(input.url);
    if (ogFallback) {
      return {
        text: ogFallback.text,
        mediaUrl: ogFallback.mediaUrl,
        providerRaw: {
          cobalt: payload,
          fallback: ogFallback.providerRaw,
        },
      };
    }

    return {
      text: `Social link submitted: ${input.url}`,
      providerRaw: payload,
    };
  } catch {
    const ogFallback = await getOpenGraphFallback(input.url);
    if (ogFallback) {
      return {
        text: ogFallback.text,
        mediaUrl: ogFallback.mediaUrl,
        providerRaw: ogFallback.providerRaw,
      };
    }
    return {
      text: `Social link submitted: ${input.url}`,
    };
  }
}
