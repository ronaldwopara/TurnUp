import type { IngestEventPayload, ParsedEvent } from "@/lib/api-types";

export function toParsedEvent(payload?: IngestEventPayload): ParsedEvent | null {
  const event = payload?.event;
  const title = event?.title?.trim() ?? "";
  if (!title || title.toLowerCase() === "no flyer found") {
    return null;
  }

  const warnings = Array.from(
    new Set([...(payload?.ambiguityNotes ?? []), ...(payload?.deterministic?.warnings ?? [])])
  );

  return {
    title,
    date: event?.date ?? "",
    time: event?.time ?? "",
    location: event?.location ?? "",
    description: event?.description ?? "",
    googleCalendarUrl: payload?.calendarPayload?.googleCalendarUrl,
    confidence: payload?.deterministic?.confidence,
    warnings,
  };
}
