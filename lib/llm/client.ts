const DEFAULT_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4.1-mini";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatMessage = {
  role: "system" | "user";
  content: string | ContentPart[];
};

export async function callStructuredLlm<T>({
  messages,
  jsonSchemaName,
}: {
  messages: ChatMessage[];
  jsonSchemaName: string;
}): Promise<T | null> {
  const apiKey = process.env.TURNUP_LLM_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch(process.env.TURNUP_LLM_API_URL ?? DEFAULT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.TURNUP_LLM_MODEL ?? DEFAULT_MODEL,
      messages,
      temperature: 0.1,
      response_format: {
        type: "json_object",
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    console.warn(`Unable to parse ${jsonSchemaName} JSON from LLM response`);
    return null;
  }
}
