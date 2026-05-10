import { callStructuredLlm } from "@/lib/llm/client";
import { extractionResultSchema, type ExtractionResult } from "@/lib/extraction/eventSchema";

export async function normalizeTextToEvent(input: {
  text: string;
  sourceLabel?: string;
}): Promise<ExtractionResult> {
  const currentYear = new Date().getFullYear();
  const llm = await callStructuredLlm<unknown>({
    jsonSchemaName: "ExtractionResult",
    messages: [
      {
        role: "system",
        content:
          `Normalize event information into JSON fields. Return only valid JSON with extractedText, event, ambiguityNotes. ` +
          `REFERENCE_YEAR=${currentYear} is injected by the application: use exactly this integer when the source omits a year. ` +
          `Never substitute a different year unless it appears in the source text.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `REFERENCE_YEAR=${currentYear} (integer set by the server).`,
              `Use exactly ${currentYear} for event.date when the source text shows a date without a four-digit year; keep any printed year verbatim.`,
              "",
              `Source: ${input.sourceLabel ?? "unknown"}`,
              "Text:",
              input.text,
            ].join("\n"),
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
