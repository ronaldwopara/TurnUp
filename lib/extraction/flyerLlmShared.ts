import { extractionResultSchema, type ExtractionResult } from "./eventSchema";

export const NO_FLYER_TITLE = "no flyer found";

/** Injected into LLM system prompts so `event.date` / `time` / `calendarSchedule` match server-side Google Calendar `eventedit` URL rules. */
export const FLYER_LLM_GOOGLE_CALENDAR_URL_RULES = [
  "Google Calendar URLs are built server-side from your `event.date`, `event.time`, and `event.calendarSchedule` (timezone America/Edmonton is fixed in the app).",
  "Single-day timed events: put that day in `event.date` and a clear clock range in `event.time` (e.g. 7:30 PM - 9:00 PM).",
  "Multi-day ALL-DAY (no per-day session times on the flyer): leave `event.time` null; put the full printed span in `event.date` (ranges like Jan 15-17, 2026, or lists like Jan 6, 7, and 8). The server uses all-day `dates=YYYYMMDD/YYYYMMDD` with an exclusive end day.",
  "Multi-day with the SAME hours each day (e.g. fair Jan 6-8, 10am-3pm daily): set `calendarSchedule` to `daily_same_hours`; keep every printed calendar day in `event.date`; put the daily session clock range in `event.time`. The server uses the first day’s start/end times plus `recur=RRULE:FREQ=DAILY;COUNT=N`.",
  "One continuous timed block across days (first day start through last day end as a single stretch): set `calendarSchedule` to `multi_day_continuous`; preserve printed dates/times so the span is unambiguous.",
  "If unsure between daily_same_hours and multi_day_continuous, prefer `daily_same_hours` when the flyer repeats the same hours each day; use `multi_day_continuous` only when it is clearly one uninterrupted block.",
].join(" ");

export const FLYER_EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["extractedText", "event", "ambiguityNotes"],
  properties: {
    extractedText: {
      type: "string",
      description:
        "Normalized transcript of flyer text in reading order (from OCR cleanup or true transcription). Empty only if no text.",
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
          description:
            "Event time(s) as printed; null only if invisible or all-day. For daily_same_hours use one session range per day (e.g. 10:00 AM - 3:00 PM). For multi_day_continuous preserve printed start/end times across the span.",
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
            "Controls Google Calendar eventedit: null for single-day or all-day-only. daily_same_hours = same clock hours each consecutive day (server: first-day times + RRULE DAILY COUNT). multi_day_continuous = one timed span from first day start through last day end. Omit/null when not multi-day timed.",
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

export function buildEventFlyerExtractionSchema(referenceYear: number): Record<string, unknown> {
  const schema = JSON.parse(JSON.stringify(FLYER_EXTRACTION_JSON_SCHEMA)) as Record<string, unknown>;
  const eventSchema = schema.properties as Record<string, unknown>;
  const eventDef = eventSchema.event as Record<string, unknown>;
  const eventProps = eventDef.properties as Record<string, unknown>;
  const dateField = eventProps.date as { description: string };
  dateField.description =
    `Event date(s) as printed; null only if invisible. Preserve ranges (e.g. Feb 12-17, 2023) and multi-day lists ` +
    `(e.g. Jan 6, 7, & 8, 2026 or Jan 6, 7, and 8 of 2026). ` +
    `If no four-digit year appears on the flyer, include year ${referenceYear} in event.date. ` +
    `If a year is printed, use only that year—do not substitute ${referenceYear}. ` +
    `Multi-day ranges/lists must be complete so the server can build correct Google Calendar all-day or multi-day timed URLs.`;
  return schema;
}

export function noFlyerResult(reason: string, contextHint?: string): ExtractionResult {
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

export function normalizeFlyerExtraction(result: ExtractionResult): ExtractionResult {
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
    return noFlyerResult("Did not contain any readable flyer content.");
  }

  return {
    ...result,
    event: {
      ...result.event,
      title,
    },
  };
}

export function safeParseExtractionResult(raw: unknown): ExtractionResult | null {
  const parsed = extractionResultSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
