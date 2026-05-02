import { callStructuredLlm } from "@/lib/llm/client";
import { extractionResultSchema, type ExtractionResult } from "@/lib/extraction/eventSchema";

function mockFromContext(context: string): ExtractionResult {
  const fallbackTitle = context.split("\n")[0]?.trim() || "Campus Event";
  return {
    extractedText: context,
    event: {
      title: fallbackTitle.slice(0, 120),
      date: undefined,
      time: undefined,
      location: undefined,
      description: context.slice(0, 280),
      confidence: 0.35,
    },
    ambiguityNotes: ["Using fallback parser because LLM credentials are not configured."],
  };
}

export async function extractFromImageWithLlm(input: {
  imageBase64: string;
  mimeType: string;
  contextHint?: string;
}): Promise<ExtractionResult> {
  const prompt = [
    "Extract event details from this campus flyer image.",
    "Return strict JSON with keys: extractedText, event, ambiguityNotes.",
    "event must include title, date, time, location, description, confidence (0-1).",
    "If uncertain, keep best guess and list uncertainties in ambiguityNotes.",
    input.contextHint ? `Additional context: ${input.contextHint}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const llm = await callStructuredLlm<unknown>({
    jsonSchemaName: "ExtractionResult",
    messages: [
      {
        role: "system",
        content:
          "You are an event extraction engine. Return compact JSON only with no markdown.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` },
          },
        ],
      },
    ],
  });

  const parsed = extractionResultSchema.safeParse(llm);
  if (parsed.success) {
    return parsed.data;
  }

  return mockFromContext(input.contextHint ?? "Campus event flyer");
}
