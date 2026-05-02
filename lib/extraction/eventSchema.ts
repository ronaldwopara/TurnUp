import { z } from "zod";

export const eventPayloadSchema = z.object({
  title: z.string().min(1),
  date: z.string().optional(),
  time: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.5),
});

export const extractionResultSchema = z.object({
  extractedText: z.string().default(""),
  event: eventPayloadSchema,
  ambiguityNotes: z.array(z.string()).default([]),
});

export type EventPayload = z.infer<typeof eventPayloadSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export type CalendarPayload = {
  title: string;
  description?: string;
  location?: string;
  startsAt?: string;
  timezone?: string;
  googleCalendarUrl?: string;
  outlookCalendarUrl?: string;
};

const GOOGLE_BASE = "https://calendar.google.com/calendar/render?action=TEMPLATE";
const OUTLOOK_BASE = "https://outlook.office.com/calendar/0/deeplink/compose";

function encodePart(value?: string): string {
  return encodeURIComponent(value ?? "");
}

export function buildCalendarPayload(event: EventPayload): CalendarPayload {
  const title = event.title;
  const description = event.description;
  const location = event.location;
  const startsAt = event.date ? `${event.date} ${event.time ?? ""}`.trim() : undefined;

  return {
    title,
    description,
    location,
    startsAt,
    timezone: "America/Edmonton",
    googleCalendarUrl:
      `${GOOGLE_BASE}&text=${encodePart(title)}` +
      `&details=${encodePart(description)}` +
      `&location=${encodePart(location)}`,
    outlookCalendarUrl:
      `${OUTLOOK_BASE}?subject=${encodePart(title)}` +
      `&body=${encodePart(description)}` +
      `&location=${encodePart(location)}`,
  };
}
