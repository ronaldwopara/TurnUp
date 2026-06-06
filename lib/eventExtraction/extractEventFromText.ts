import {
  tryPickMultiDayDateStringFromCandidates,
  tryPickMultiDayDateStringFromOcrText,
  type EventPayload,
  type ExtractionResult,
} from "../extraction/eventSchema";
import { parseEvent, type ParsedEvent } from "../parser/parseEvent";

function formatDateYmd(value: Date): string {
  return [
    String(value.getFullYear()).padStart(4, "0"),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatTime12h(value: Date): string {
  const hour24 = value.getHours();
  const minute = value.getMinutes();
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

function differentLocalCalendarDays(a: Date, b: Date): boolean {
  return formatDateYmd(a) !== formatDateYmd(b);
}

function hasParsedTimeRange(parsed: ParsedEvent): boolean {
  return Boolean(parsed.start && parsed.end);
}

/** One line encodes start + end clock (e.g. "Jan 6, 2026 9:00 AM to Jan 8, 2026 5:00 PM") → continuous span, not RRULE. */
function printedDateSuggestsContinuousTimedSpan(printed: string): boolean {
  const normalized = printed.replace(/\s+/g, " ").trim();
  const parts = normalized.split(/\s+to\s+/i).map((p) => p.trim());
  if (parts.length !== 2) {
    return false;
  }
  const [a, b] = parts;
  if (!a || !b) {
    return false;
  }
  return (
    /\b(am|pm)\b/i.test(a) &&
    /\b(am|pm)\b/i.test(b) &&
    /\d{4}/.test(a) &&
    /\d{4}/.test(b)
  );
}

/**
 * Maps deterministic parser output into `EventPayload`, preserving multi-day dates when the
 * source text (or chrono fragments) include lists/ranges so `buildCalendarPayload` can emit RRULE
 * or continuous multi-day spans.
 */
export function parsedEventToEventPayload(parsed: ParsedEvent, sourceText?: string): EventPayload {
  const title = parsed.title?.trim() || "Untitled Event";
  const time = parsed.start
    ? parsed.end
      ? `${formatTime12h(parsed.start)} - ${formatTime12h(parsed.end)}`
      : formatTime12h(parsed.start)
    : undefined;

  let date: string | undefined;
  let calendarSchedule: EventPayload["calendarSchedule"];

  if (parsed.start) {
    const fromOcr = sourceText ? tryPickMultiDayDateStringFromOcrText(sourceText) : null;
    const fromChrono = tryPickMultiDayDateStringFromCandidates(parsed.debug?.detectedDates ?? []);
    const printedMulti = fromOcr ?? fromChrono;

    if (printedMulti) {
      date = printedMulti;
      if (hasParsedTimeRange(parsed)) {
        calendarSchedule = printedDateSuggestsContinuousTimedSpan(printedMulti)
          ? "multi_day_continuous"
          : "daily_same_hours";
      }
    } else if (parsed.end && differentLocalCalendarDays(parsed.start, parsed.end)) {
      date = `${formatDateYmd(parsed.start)} to ${formatDateYmd(parsed.end)}`;
      if (hasParsedTimeRange(parsed)) {
        calendarSchedule = "multi_day_continuous";
      }
    } else {
      date = formatDateYmd(parsed.start);
    }
  }

  return {
    title,
    date,
    time,
    calendarSchedule,
    location: parsed.location?.trim() || undefined,
    description: parsed.description?.trim() || undefined,
    confidence: Math.max(0, Math.min(1, parsed.confidence / 100)),
  };
}

export function parseTextToExtractionResult(text: string): {
  parsedEvent: ParsedEvent;
  extractionResult: ExtractionResult;
} {
  const parsedEvent = parseEvent(text);
  const ambiguityNotes = [...(parsedEvent.warnings ?? [])];
  const extractionResult: ExtractionResult = {
    extractedText: text,
    event: parsedEventToEventPayload(parsedEvent, text),
    ambiguityNotes,
  };
  return { parsedEvent, extractionResult };
}
