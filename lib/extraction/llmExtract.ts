import { callStructuredLlm } from "../llm/client";
import type { ExtractionResult } from "./eventSchema";
import {
  buildEventFlyerExtractionSchema,
  FLYER_LLM_GOOGLE_CALENDAR_URL_RULES,
  normalizeFlyerExtraction,
  noFlyerResult,
  NO_FLYER_TITLE,
  safeParseExtractionResult,
} from "./flyerLlmShared";

function buildFlyerSystemPrompt(referenceYear: number): string {
  return (
    "You are a vision-language extraction engine for event flyers, posters, " +
    "invitations, and event-style graphics. Produce JSON matching the schema exactly. " +
    "Never refuse, never add prose outside the JSON object. " +
    `The application sets REFERENCE_YEAR=${referenceYear}. When the flyer omits a year, use exactly ${referenceYear} in event.date. ` +
    "When a year is visible on the flyer, transcribe that year and do not replace it. " +
    FLYER_LLM_GOOGLE_CALENDAR_URL_RULES
  );
}

const USER_PROMPT_BASE = [
  "Extract event details from this image.",
  "",
  "What counts as a flyer/poster:",
  "- Posters, flyers, handbills, digital invites, save-the-dates, event-style social graphics.",
  "- Anything advertising a gathering, performance, meeting, sale, party, club event, etc.",
  "- Angled crops, low light, and stylized fonts are still flyers.",
  "",
  "Be permissive:",
  "- Short titles are valid (e.g. Mixer, Gala, BBQ, Open Mic).",
  "- Missing date, time, or location does NOT make it \"not a flyer\"; use null for those fields.",
  "- Use title exactly 'no flyer found' only when the image clearly is not an event flyer.",
  "",
  "Reading:",
  "- Put OCR text in extractedText; summarize in description without inventing facts.",
  "- Preserve date ranges with an explicit year when printed (e.g. Feb 12-17, 2023) or without (e.g. Jan 15-17 or Jan 6, 7, and 8); missing years use REFERENCE_YEAR from the prompt header.",
  "- If the flyer shows a month/day but no year, still include the month/day and use REFERENCE_YEAR from the header.",
  "- Preserve time ranges (e.g. 10:00 AM - 3:00 PM) in event.time.",
  "- If unreadable parts remain, explain in ambiguityNotes.",
  "",
  "Calendar semantics (must match Google Calendar URL rules in the system message):",
  "- Multiple days with the SAME hours each day (fair Jan 6-8, 10am-3pm): set calendarSchedule to daily_same_hours.",
  "- One continuous timed block from first day through last day: multi_day_continuous.",
  "- Single day or only all-day dates: calendarSchedule null.",
  "",
  "Confidence:",
  "- 0.85+ flyer clear and ≥1 legible scheduling/location cue often present.",
  "- 0.55–0.84 flyer clear but many fields unreadable.",
  "- 0.30–0.54 partial flyer read.",
  "- ~0 flyer or unreadable.",
].join("\n");

async function callImageExtraction(input: {
  imageBase64: string;
  mimeType: string;
  contextHint?: string;
  retryHint?: string;
}): Promise<ExtractionResult | null> {
  const referenceYear = new Date().getFullYear();
  const promptParts = [
    `REFERENCE_YEAR=${referenceYear} (integer set by the server—use this exact value whenever the flyer shows a date without a four-digit year).`,
    "",
    USER_PROMPT_BASE,
    "",
    `If any date on the flyer has no year printed, write event.date using year ${referenceYear} only. If a year is printed on the flyer, keep that year.`,
  ];
  if (input.contextHint?.trim()) {
    promptParts.push("", `Additional context: ${input.contextHint.trim()}`);
  }
  if (input.retryHint?.trim()) {
    promptParts.push("", input.retryHint.trim());
  }
  const prompt = promptParts.join("\n");

  const llm = await callStructuredLlm<unknown>({
    jsonSchemaName: "EventFlyerExtraction",
    jsonSchema: buildEventFlyerExtractionSchema(referenceYear),
    messages: [
      { role: "system", content: buildFlyerSystemPrompt(referenceYear) },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${input.mimeType};base64,${input.imageBase64}`,
              detail: "high",
            },
          },
        ],
      },
    ],
  });

  if (!llm) {
    return null;
  }

  return safeParseExtractionResult(llm);
}

export async function extractFromImageWithLlm(input: {
  imageBase64: string;
  mimeType: string;
  contextHint?: string;
}): Promise<ExtractionResult> {
  const first = await callImageExtraction(input);

  if (!first) {
    return noFlyerResult("LLM extraction failed or returned invalid JSON.", input.contextHint);
  }

  const normalized = normalizeFlyerExtraction(first);

  const isNoFlyer = normalized.event.title.toLowerCase() === NO_FLYER_TITLE;
  const firstHadText = first.extractedText.trim().length >= 8;
  const lowConfidence = normalized.event.confidence < 0.35;

  if ((isNoFlyer || lowConfidence) && firstHadText) {
    const retry = await callImageExtraction({
      ...input,
      retryHint:
        "Previous pass returned 'no flyer found' or low confidence but text was visible. " +
        "Re-read the image: if any event-style content exists (title, date, time, location), extract it. " +
        "Keep 'no flyer found' only if it is genuinely not an event flyer.",
    });
    if (retry) {
      const retryNormalized = normalizeFlyerExtraction(retry);
      const retryIsNoFlyer = retryNormalized.event.title.toLowerCase() === NO_FLYER_TITLE;
      if (!retryIsNoFlyer) {
        return retryNormalized;
      }
    }
  }

  return normalized;
}
