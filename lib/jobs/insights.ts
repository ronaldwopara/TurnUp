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

export async function regenerateInsightsForUser(userId: string) {
  const eventRows = await getRecentEventTexts(userId);
  const generated = heuristicFacts(eventRows);
  return replaceLearnedFacts(userId, generated);
}
