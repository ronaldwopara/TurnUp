export type SocialExtractionInput = {
  url: string;
};

export type SocialExtractionOutput = {
  text: string;
  mediaUrl?: string;
  providerRaw?: unknown;
};

const DEFAULT_COBALT_ENDPOINT = "https://api.cobalt.tools/api/json";

export async function getSocialMediaContent(
  input: SocialExtractionInput
): Promise<SocialExtractionOutput> {
  const endpoint = process.env.COBALT_API_URL ?? DEFAULT_COBALT_ENDPOINT;
  const apiKey = process.env.COBALT_API_KEY;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Api-Key ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        url: input.url,
        filenamePattern: "classic",
        downloadMode: "auto",
      }),
    });

    if (!response.ok) {
      return {
        text: `Social link submitted: ${input.url}`,
      };
    }

    const payload = (await response.json()) as {
      text?: string;
      status?: string;
      url?: string;
      picker?: Array<{ type?: string; url?: string }>;
      [key: string]: unknown;
    };

    const mediaUrl = payload.url ?? payload.picker?.[0]?.url;
    const textFromProvider = payload.text ?? "";
    return {
      text: [textFromProvider, `Source URL: ${input.url}`].filter(Boolean).join("\n"),
      mediaUrl,
      providerRaw: payload,
    };
  } catch {
    return {
      text: `Social link submitted: ${input.url}`,
    };
  }
}
