import { callStructuredLlm } from "@/lib/llm/client";
import { replaceLearnedFacts } from "@/lib/repos/profileRepo";
import { getRecentEventTexts } from "@/lib/repos/stashRepo";

type LearnedFactDraft = {
  text: string;
  factType: string;
  confidence: number;
};

function heuristicFacts(eventRows: string[]): LearnedFactDraft[] {
  const lowered = eventRows.join("\n").toLowerCase();
  const out: LearnedFactDraft[] = [];

  if (/(morning|8am|9am|10am)/.test(lowered)) {
    out.push({ text: "Prefers morning classes", factType: "schedule", confidence: 0.76 });
  }
  if (/(music|concert|jazz|dj)/.test(lowered)) {
    out.push({ text: "Music lover", factType: "interest", confidence: 0.81 });
  }
  if (/(hackathon|tech|engineering|startup|ai)/.test(lowered)) {
    out.push({ text: "Tech event enthusiast", factType: "interest", confidence: 0.79 });
  }
  if (/(north campus|science|biol|biology)/.test(lowered)) {
    out.push({ text: "Studies on North Campus", factType: "campus_pattern", confidence: 0.7 });
  }

  if (out.length === 0) {
    out.push({ text: "Exploring diverse campus events", factType: "general", confidence: 0.55 });
  }

  return out.slice(0, 8);
}

async function llmFacts(eventRows: string[]): Promise<LearnedFactDraft[] | null> {
  const llm = await callStructuredLlm<{
    learnedFacts?: Array<{ text?: string; type?: string; confidence?: number }>;
  }>({
    jsonSchemaName: "LearnedFacts",
    messages: [
      {
        role: "system",
        content:
          "You generate compact student profile facts from event history. Return JSON with learnedFacts array only.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "From this event history, output up to 8 short profile facts.\n" +
              "Each fact must include text, type, confidence(0-1).\n\n" +
              eventRows.join("\n"),
          },
        ],
      },
    ],
  });

  if (!llm?.learnedFacts?.length) {
    return null;
  }

  const cleaned = llm.learnedFacts
    .map((item) => ({
      text: item.text?.trim() ?? "",
      factType: item.type?.trim() || "llm_inferred",
      confidence: Math.min(1, Math.max(0, item.confidence ?? 0.6)),
    }))
    .filter((item) => item.text.length > 0);

  return cleaned.length ? cleaned.slice(0, 8) : null;
}

export async function regenerateInsightsForUser(userId: string) {
  const eventRows = await getRecentEventTexts(userId);
  const generated = (await llmFacts(eventRows)) ?? heuristicFacts(eventRows);
  return replaceLearnedFacts(userId, generated);
}
