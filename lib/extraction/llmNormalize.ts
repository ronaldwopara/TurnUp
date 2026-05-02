import { callStructuredLlm } from "@/lib/llm/client";
import { extractionResultSchema, type ExtractionResult } from "@/lib/extraction/eventSchema";

export async function normalizeTextToEvent(input: {
  text: string;
  sourceLabel?: string;
}): Promise<ExtractionResult> {
  const llm = await callStructuredLlm<unknown>({
    jsonSchemaName: "ExtractionResult",
    messages: [
      {
        role: "system",
        content:
          "Normalize event information into JSON fields. Return only valid JSON with extractedText, event, ambiguityNotes.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Source: ${input.sourceLabel ?? "unknown"}\nText:\n${input.text}`,
          },
        ],
      },
    ],
  });

  const parsed = extractionResultSchema.safeParse(llm);
  if (parsed.success) {
    return parsed.data;
  }

  const firstLine = input.text.split("\n").find((line) => line.trim().length > 0) ?? "Campus Event";
  return {
    extractedText: input.text,
    event: {
      title: firstLine.slice(0, 120),
      description: input.text.slice(0, 280),
      confidence: 0.3,
    },
    ambiguityNotes: ["Fallback normalization used due to missing/invalid LLM response."],
  };
}
