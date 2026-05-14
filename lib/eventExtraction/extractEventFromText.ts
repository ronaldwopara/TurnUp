import { parseEvent, type ParsedEvent } from "../parser/parseEvent";
import type { EventPayload, ExtractionResult } from "../extraction/eventSchema";

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

export function parsedEventToEventPayload(parsed: ParsedEvent): EventPayload {
  const title = parsed.title?.trim() || "Untitled Event";
  const startDate = parsed.start ? formatDateYmd(parsed.start) : undefined;
  const time = parsed.start
    ? parsed.end
      ? `${formatTime12h(parsed.start)} - ${formatTime12h(parsed.end)}`
      : formatTime12h(parsed.start)
    : undefined;

  return {
    title,
    date: startDate,
    time,
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
    event: parsedEventToEventPayload(parsedEvent),
    ambiguityNotes,
  };
  return { parsedEvent, extractionResult };
}
