import {
  fetchValidatedPosterDataUrl,
  isLowQualityInstagramPosterUrl,
} from "@/lib/extraction/poster-image";

type MicrolinkResponse = {
  status?: string;
  data?: {
    image?: {
      url?: string;
    };
  };
};

/** Resolve poster image from a source URL via Microlink API. */
export async function fetchMicrolinkImage(sourceUrl: string): Promise<string | null> {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    return null;
  }

  const apiKey = process.env.MICROLINK_API_KEY?.trim();
  const endpoint = new URL("https://api.microlink.io");
  endpoint.searchParams.set("url", trimmed);
  endpoint.searchParams.set("filter", "image.url");

  const headers: HeadersInit = {
    Accept: "application/json",
  };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  try {
    const response = await fetch(endpoint.toString(), {
      headers,
      redirect: "follow",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as MicrolinkResponse;
    if (payload.status !== "success") {
      return null;
    }

    const imageUrl = payload.data?.image?.url?.trim();
    if (!imageUrl || isLowQualityInstagramPosterUrl(imageUrl)) {
      return null;
    }

    return await fetchValidatedPosterDataUrl(imageUrl);
  } catch {
    return null;
  }
}
