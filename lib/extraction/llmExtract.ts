import { callStructuredLlm } from "@/lib/llm/client";
import { extractionResultSchema, type ExtractionResult } from "@/lib/extraction/eventSchema";

const NO_FLYER_TITLE = "no flyer found";

const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["extractedText", "event", "ambiguityNotes"],
  properties: {
    extractedText: {
      type: "string",
      description:
        "Verbatim OCR transcription of readable flyer text in reading order. Empty string if no text.",
    },
    event: {
      type: "object",
      additionalProperties: false,
      required: ["title", "date", "time", "location", "description", "confidence", "calendarSchedule"],
      properties: {
        title: {
          type: "string",
          description:
            "Printed event name; if clearly not an event flyer, exactly 'no flyer found'. Otherwise best title even if short (e.g. Mixer, Gala).",
        },
        date: {
          type: ["string", "null"],
          description: "Event date(s) as printed; null only if invisible.",
        },
        time: {
          type: ["string", "null"],
          description: "Event time(s) as printed; null only if invisible.",
        },
        location: {
          type: ["string", "null"],
          description: "Venue/address as printed; null only if invisible.",
        },
        description: {
          type: ["string", "null"],
          description: "Short flyer summary from visible text only; null if none.",
        },
        confidence: {
          type: "number",
          description: "Confidence 0-1 this is an event flyer and title is correct; 0 if no flyer found.",
        },
        calendarSchedule: {
          anyOf: [
            { type: "null" },
            { type: "string", enum: ["daily_same_hours", "multi_day_continuous"] },
          ],
          description:
            "For calendar links: daily_same_hours when multiple days share the same session times (use recurrence). multi_day_continuous when one uninterrupted span from first day start through last day end. null for single-day or all-day-only.",
        },
      },
    },
    ambiguityNotes: {
      type: "array",
      items: { type: "string" },
      description: "Uncertainties or unreadable regions; empty if none.",
    },
  },
} as const;

function buildEventFlyerExtractionSchema(referenceYear: number): Record<string, unknown> {
  const schema = JSON.parse(JSON.stringify(EXTRACTION_JSON_SCHEMA)) as Record<string, unknown>;
  const eventSchema = schema.properties as Record<string, unknown>;
  const eventDef = eventSchema.event as Record<string, unknown>;
  const eventProps = eventDef.properties as Record<string, unknown>;
  const dateField = eventProps.date as { description: string };
  dateField.description =
    `Event date(s) as printed; null only if invisible. Preserve ranges (e.g. Feb 12-17, 2023). ` +
    `If no four-digit year appears on the flyer, include year ${referenceYear} in event.date. ` +
    `If a year is printed, use only that year—do not substitute ${referenceYear}.`;
  return schema;
}

function buildFlyerSystemPrompt(referenceYear: number): string {
  return (
    "You are a vision-language extraction engine for event flyers, posters, " +
    "invitations, and event-style graphics. Produce JSON matching the schema exactly. " +
    "Prioritize date(s) and time for Google Calendar eventedit URLs (dates=YYYYMMDDTHHMMSS/…, ctz=IANA). " +
    "Never refuse, never add prose outside the JSON object. " +
    `The application sets REFERENCE_YEAR=${referenceYear}. When the flyer omits a year, use exactly ${referenceYear} in event.date. ` +
    "When a year is visible on the flyer, transcribe that year and do not replace it."
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
  "Calendar semantics:",
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

function noFlyerResult(reason: string, contextHint?: string): ExtractionResult {
  const notes = [reason];
  if (contextHint?.trim()) {
    notes.push(`Context hint: ${contextHint.trim()}`);
  }
  return {
    extractedText: "",
    event: {
      title: NO_FLYER_TITLE,
      date: undefined,
      time: undefined,
      location: undefined,
      description: undefined,
      confidence: 0,
    },
    ambiguityNotes: notes,
  };
}

function normalizeExtraction(result: ExtractionResult): ExtractionResult {
  const title = result.event.title.trim();
  const normalizedTitle = title.toLowerCase();

  if (normalizedTitle === NO_FLYER_TITLE) {
    return {
      ...result,
      event: {
        ...result.event,
        title: NO_FLYER_TITLE,
        confidence: Math.min(result.event.confidence, 0.2),
      },
    };
  }

  const placeholderTitles = new Set(["", "event", "flyer", "poster", "image", "untitled", "unknown", "n/a"]);
  const titleIsPlaceholder = placeholderTitles.has(normalizedTitle);

  const hasSignalFields =
    Boolean(result.event.date?.trim()) ||
    Boolean(result.event.time?.trim()) ||
    Boolean(result.event.location?.trim()) ||
    Boolean(result.event.description?.trim());

  const extractedText = result.extractedText.trim();
  const hasReadableText = /[a-zA-Z]{3,}/.test(extractedText) && extractedText.length >= 8;

  if (titleIsPlaceholder && !hasSignalFields && !hasReadableText) {
    return noFlyerResult("Image did not contain any readable flyer content.");
  }

  return {
    ...result,
    event: {
      ...result.event,
      title,
    },
  };
}

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

  const parsed = extractionResultSchema.safeParse(llm);
  return parsed.success ? parsed.data : null;
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

  const normalized = normalizeExtraction(first);

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
      const retryNormalized = normalizeExtraction(retry);
      const retryIsNoFlyer = retryNormalized.event.title.toLowerCase() === NO_FLYER_TITLE;
      if (!retryIsNoFlyer) {
        return retryNormalized;
      }
    }
  }

  return normalized;
}
