const DEFAULT_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4.1";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

type ChatMessage = {
  role: "system" | "user";
  content: string | ContentPart[];
};

type JsonSchema = Record<string, unknown>;

type ResponseFormat =
  | { type: "json_object" }
  | {
      type: "json_schema";
      json_schema: {
        name: string;
        strict: true;
        schema: JsonSchema;
      };
    };

function parseJsonFromContent<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      try {
        return JSON.parse(fencedMatch[1].trim()) as T;
      } catch {
        // Continue to object-slice strategy below.
      }
    }

    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const candidate = content.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate) as T;
      } catch {
        return null;
      }
    }

    return null;
  }
}

export async function callStructuredLlm<T>({
  messages,
  jsonSchemaName,
  jsonSchema,
  temperature,
}: {
  messages: ChatMessage[];
  jsonSchemaName: string;
  jsonSchema?: JsonSchema;
  temperature?: number;
}): Promise<T | null> {
  const apiKey = process.env.TURNUP_LLM_API_KEY;
  if (!apiKey) {
    return null;
  }

  const responseFormat: ResponseFormat = jsonSchema
    ? {
        type: "json_schema",
        json_schema: {
          name: jsonSchemaName,
          strict: true,
          schema: jsonSchema,
        },
      }
    : { type: "json_object" };

  const response = await fetch(process.env.TURNUP_LLM_API_URL ?? DEFAULT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.TURNUP_LLM_MODEL ?? DEFAULT_MODEL,
      messages,
      temperature: temperature ?? 0.1,
      response_format: responseFormat,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?:
          | string
          | Array<{
              type?: string;
              text?: string;
            }>;
      };
    }>;
  };

  const rawContent = payload.choices?.[0]?.message?.content;
  const content =
    typeof rawContent === "string"
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent
            .map((part) => (typeof part?.text === "string" ? part.text : ""))
            .filter(Boolean)
            .join("\n")
        : "";

  if (!content) {
    return null;
  }

  const parsed = parseJsonFromContent<T>(content);
  if (parsed) {
    return parsed;
  }

  console.warn(`Unable to parse ${jsonSchemaName} JSON from LLM response`);
  return null;
}
