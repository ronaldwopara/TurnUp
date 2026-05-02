import { z } from "zod";

const optionalText = z
  .string()
  .nullable()
  .optional()
  .transform((value) => (value == null ? undefined : value));

export const eventPayloadSchema = z.object({
  title: z.string().min(1),
  date: optionalText,
  time: optionalText,
  calendarSchedule: z
    .enum(["daily_same_hours", "multi_day_continuous"])
    .nullable()
    .optional()
    .transform((value) => (value == null ? undefined : value)),
  location: optionalText,
  description: optionalText,
  confidence: z
    .number()
    .min(0)
    .max(1)
    .nullable()
    .optional()
    .transform((value) => (value == null ? 0.5 : value)),
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

const GOOGLE_EVENT_EDIT_BASE = "https://calendar.google.com/calendar/u/0/r/eventedit";
const OUTLOOK_BASE = "https://outlook.office.com/calendar/0/deeplink/compose";
const DEFAULT_TIMEZONE = "America/Edmonton";

function encodePart(value?: string): string {
  return encodeURIComponent(value ?? "");
}

export type GoogleCalendarDateInput = Date | string;

type GoogleCalendarEventEditInput = {
  title: string;
  details?: string;
  location?: string;
  start: GoogleCalendarDateInput;
  end: GoogleCalendarDateInput;
  timezone: string;
  isAllDay?: boolean;
  recurrenceDays?: number;
};

function parseIsoDate(input: string): { year: number; month: number; day: number } | null {
  const match = input.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return { year, month, day };
}

function parseLooseDate(input: string): { year: number; month: number; day: number } | null {
  const normalized = input
    .trim()
    .replace(/(\d{1,2})(st|nd|rd|th)\b/gi, "$1")
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  };
}

function parseMonthDayRange(input: string): {
  start: { year: number; month: number; day: number };
  end: { year: number; month: number; day: number };
} | null {
  const normalized = input.trim().replace(/\s+/g, " ");
  const rangeMatch = normalized.match(/^([A-Za-z]+)\s+(\d{1,2})\s*[-–—]\s*(\d{1,2}),\s*(\d{4})$/);
  if (!rangeMatch) {
    return null;
  }

  const monthName = rangeMatch[1];
  const startDay = Number(rangeMatch[2]);
  const endDay = Number(rangeMatch[3]);
  const year = Number(rangeMatch[4]);

  const monthDate = new Date(`${monthName} 1, ${year}`);
  if (
    Number.isNaN(monthDate.getTime()) ||
    !Number.isFinite(startDay) ||
    !Number.isFinite(endDay) ||
    startDay < 1 ||
    endDay < 1
  ) {
    return null;
  }

  const month = monthDate.getMonth() + 1;
  return {
    start: { year, month, day: startDay },
    end: { year, month, day: endDay },
  };
}

function parseMonthDayList(input: string): {
  start: { year: number; month: number; day: number };
  end: { year: number; month: number; day: number };
} | null {
  const normalized = input.trim().replace(/\s+/g, " ");
  const listMatch = normalized.match(/^([A-Za-z]+)\s+(.+?)\s*(?:of\s+)?(\d{4})$/);
  if (!listMatch) {
    return null;
  }

  const monthName = listMatch[1];
  const daySection = listMatch[2];
  const year = Number(listMatch[3]);

  const monthDate = new Date(`${monthName} 1, ${year}`);
  if (Number.isNaN(monthDate.getTime())) {
    return null;
  }

  const dayNumbers = Array.from(daySection.matchAll(/\d{1,2}/g))
    .map((match) => Number(match[0]))
    .filter((day) => Number.isFinite(day) && day >= 1 && day <= 31);

  if (dayNumbers.length < 2) {
    return null;
  }

  const startDay = Math.min(...dayNumbers);
  const endDay = Math.max(...dayNumbers);
  const month = monthDate.getMonth() + 1;
  return {
    start: { year, month, day: startDay },
    end: { year, month, day: endDay },
  };
}

function parseDateRange(input?: string): {
  start: { year: number; month: number; day: number };
  end: { year: number; month: number; day: number };
} | null {
  if (!input?.trim()) {
    return null;
  }

  const value = input.trim();
  const monthDayRange = parseMonthDayRange(value);
  if (monthDayRange) {
    return monthDayRange;
  }

  const monthDayList = parseMonthDayList(value);
  if (monthDayList) {
    return monthDayList;
  }

  const withExplicitSeparator = value.split(/\s+(?:to|[-–—])\s+/i).map((part) => part.trim());
  if (withExplicitSeparator.length === 2) {
    const start = parseIsoDate(withExplicitSeparator[0]) ?? parseLooseDate(withExplicitSeparator[0]);
    const end = parseIsoDate(withExplicitSeparator[1]) ?? parseLooseDate(withExplicitSeparator[1]);
    if (start && end) {
      return { start, end };
    }
  }

  const isoSingle = parseIsoDate(value) ?? parseLooseDate(value);
  if (isoSingle) {
    return { start: isoSingle, end: isoSingle };
  }

  return null;
}

function parseTimeToken(input: string, fallbackMeridiem?: "am" | "pm"): { hour: number; minute: number } | null {
  const normalized = input.trim().toLowerCase().replace(/\./g, "");
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = (match[3] as "am" | "pm" | undefined) ?? fallbackMeridiem;
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) {
    return null;
  }

  if (meridiem) {
    if (hour < 1 || hour > 12) {
      return null;
    }
    if (meridiem === "am") {
      hour = hour === 12 ? 0 : hour;
    } else {
      hour = hour === 12 ? 12 : hour + 12;
    }
  } else if (hour > 23) {
    return null;
  }

  return { hour, minute };
}

function parseTimeRange(input?: string): { startHour: number; startMinute: number; endHour: number; endMinute: number } | null {
  if (!input?.trim()) {
    return null;
  }

  const normalized = input
    .trim()
    .replace(/[–—]/g, "-")
    .replace(/\s+to\s+/gi, "-");
  const tokens = normalized
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return null;
  }

  const endMeridiem = (tokens[1]?.toLowerCase().match(/\b(am|pm)\b/)?.[1] ?? undefined) as "am" | "pm" | undefined;
  const startMeridiem = (tokens[0]?.toLowerCase().match(/\b(am|pm)\b/)?.[1] ?? undefined) as "am" | "pm" | undefined;

  const start = parseTimeToken(tokens[0], startMeridiem ?? endMeridiem);
  if (!start) {
    return null;
  }

  const end = tokens[1] ? parseTimeToken(tokens[1], endMeridiem ?? startMeridiem) : null;
  if (end) {
    return {
      startHour: start.hour,
      startMinute: start.minute,
      endHour: end.hour,
      endMinute: end.minute,
    };
  }

  const fallbackEnd = new Date(2000, 0, 1, start.hour, start.minute, 0, 0);
  fallbackEnd.setHours(fallbackEnd.getHours() + 2);
  return {
    startHour: start.hour,
    startMinute: start.minute,
    endHour: fallbackEnd.getHours(),
    endMinute: fallbackEnd.getMinutes(),
  };
}

function toGoogleDateTime(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");
  const second = date.getSeconds().toString().padStart(2, "0");
  return `${year}${month}${day}T${hour}${minute}${second}`;
}

function toGoogleAllDay(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}${month}${day}`;
}

function toLocalIso(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");
  const second = date.getSeconds().toString().padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function normalizeDateInput(value: GoogleCalendarDateInput): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("Invalid Date object provided for Google Calendar URL.");
    }
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date string provided for Google Calendar URL: ${value}`);
  }
  return parsed;
}

export function buildGoogleCalendarEventEditUrl(input: GoogleCalendarEventEditInput): string {
  const start = normalizeDateInput(input.start);
  const end = normalizeDateInput(input.end);
  if (input.isAllDay ? end < start : end <= start) {
    throw new Error("Google Calendar end date must be after start date.");
  }
  const timezone = input.timezone.trim();
  if (!timezone) {
    throw new Error("Google Calendar timezone must be a non-empty IANA timezone string.");
  }

  const recurrenceDays = input.recurrenceDays;
  if (recurrenceDays != null && (!Number.isInteger(recurrenceDays) || recurrenceDays < 1)) {
    throw new Error("Google Calendar recurrenceDays must be a positive integer.");
  }

  let datesValue: string;
  if (input.isAllDay) {
    const inclusiveEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);
    const exclusiveEnd = new Date(inclusiveEnd);
    exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
    datesValue = `${toGoogleAllDay(start)}/${toGoogleAllDay(exclusiveEnd)}`;
  } else if (recurrenceDays && recurrenceDays > 1) {
    const firstDayEnd = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
      end.getHours(),
      end.getMinutes(),
      end.getSeconds(),
      0
    );
    if (firstDayEnd <= start) {
      firstDayEnd.setDate(firstDayEnd.getDate() + 1);
    }
    datesValue = `${toGoogleDateTime(start)}/${toGoogleDateTime(firstDayEnd)}`;
  } else {
    datesValue = `${toGoogleDateTime(start)}/${toGoogleDateTime(end)}`;
  }

  const params = new URLSearchParams();
  params.set("text", input.title);
  params.set("details", input.details ?? "");
  params.set("location", input.location ?? "");
  params.set("dates", datesValue);
  params.set("ctz", timezone);
  if (recurrenceDays && recurrenceDays > 1) {
    params.set("recur", `RRULE:FREQ=DAILY;COUNT=${recurrenceDays}`);
  }

  return `${GOOGLE_EVENT_EDIT_BASE}?${params.toString()}`;
}

function inclusiveCalendarDayCount(
  start: { year: number; month: number; day: number },
  end: { year: number; month: number; day: number }
): number {
  const startMidnight = new Date(start.year, start.month - 1, start.day);
  const endMidnight = new Date(end.year, end.month - 1, end.day);
  const diffDays = Math.round((endMidnight.getTime() - startMidnight.getTime()) / 86400000);
  return diffDays + 1;
}

function buildCalendarDateParts(event: EventPayload): {
  startsAt?: string;
  startDate?: Date;
  endDate?: Date;
  isAllDay?: boolean;
  recurrenceDays?: number;
  outlookStart?: string;
  outlookEnd?: string;
} {
  const dateRange = parseDateRange(event.date);
  if (!dateRange) {
    return {
      startsAt: event.date ? `${event.date} ${event.time ?? ""}`.trim() : undefined,
    };
  }

  const startDateParts = dateRange.start;
  const endDateParts = dateRange.end;
  const timeRange = parseTimeRange(event.time);

  if (!timeRange) {
    const startDate = new Date(startDateParts.year, startDateParts.month - 1, startDateParts.day, 0, 0, 0, 0);
    const endDate = new Date(endDateParts.year, endDateParts.month - 1, endDateParts.day, 0, 0, 0, 0);
    const outlookExclusiveEnd = new Date(endDate);
    outlookExclusiveEnd.setDate(outlookExclusiveEnd.getDate() + 1);
    return {
      startsAt: event.date,
      startDate,
      endDate,
      isAllDay: true,
      outlookStart: toLocalIso(startDate),
      outlookEnd: toLocalIso(outlookExclusiveEnd),
    };
  }

  const spanDays = inclusiveCalendarDayCount(startDateParts, endDateParts);
  const useDailyRecurrence = spanDays > 1 && event.calendarSchedule !== "multi_day_continuous";

  const blockStart = new Date(
    startDateParts.year,
    startDateParts.month - 1,
    startDateParts.day,
    timeRange.startHour,
    timeRange.startMinute,
    0,
    0
  );

  if (useDailyRecurrence) {
    const blockEndSameDay = new Date(
      startDateParts.year,
      startDateParts.month - 1,
      startDateParts.day,
      timeRange.endHour,
      timeRange.endMinute,
      0,
      0
    );
    if (blockEndSameDay <= blockStart) {
      blockEndSameDay.setDate(blockEndSameDay.getDate() + 1);
    }

    return {
      startsAt: `${event.date} ${event.time ?? ""}`.trim(),
      startDate: blockStart,
      endDate: blockEndSameDay,
      isAllDay: false,
      recurrenceDays: spanDays,
      outlookStart: toLocalIso(blockStart),
      outlookEnd: toLocalIso(blockEndSameDay),
    };
  }

  const endDate = new Date(
    endDateParts.year,
    endDateParts.month - 1,
    endDateParts.day,
    timeRange.endHour,
    timeRange.endMinute,
    0,
    0
  );
  if (endDate <= blockStart) {
    endDate.setDate(endDate.getDate() + 1);
  }

  return {
    startsAt: `${event.date} ${event.time ?? ""}`.trim(),
    startDate: blockStart,
    endDate,
    isAllDay: false,
    outlookStart: toLocalIso(blockStart),
    outlookEnd: toLocalIso(endDate),
  };
}

export function buildCalendarPayload(
  event: EventPayload,
  options?: {
    qrUrl?: string | null;
  }
): CalendarPayload {
  const title = event.title;
  const description = event.description;
  const googleDescription = [description, options?.qrUrl ? `QR link: ${options.qrUrl}` : ""]
    .filter(Boolean)
    .join("\n\n");
  const location = event.location;
  const calendarDateParts = buildCalendarDateParts(event);

  const googleCalendarUrl =
    calendarDateParts.startDate && calendarDateParts.endDate
      ? buildGoogleCalendarEventEditUrl({
          title,
          details: googleDescription,
          location,
          start: calendarDateParts.startDate,
          end: calendarDateParts.endDate,
          timezone: DEFAULT_TIMEZONE,
          isAllDay: calendarDateParts.isAllDay,
          recurrenceDays: calendarDateParts.recurrenceDays,
        })
      : `${GOOGLE_EVENT_EDIT_BASE}?text=${encodePart(title)}&details=${encodePart(googleDescription)}&location=${encodePart(location)}&ctz=${encodePart(DEFAULT_TIMEZONE)}`;

  const outlookDateQuery =
    calendarDateParts.outlookStart && calendarDateParts.outlookEnd
      ? `&startdt=${encodePart(calendarDateParts.outlookStart)}&enddt=${encodePart(calendarDateParts.outlookEnd)}`
      : "";

  return {
    title,
    description,
    location,
    startsAt: calendarDateParts.startsAt,
    timezone: DEFAULT_TIMEZONE,
    googleCalendarUrl,
    outlookCalendarUrl:
      `${OUTLOOK_BASE}?subject=${encodePart(title)}` +
      `&body=${encodePart(description)}` +
      `&location=${encodePart(location)}` +
      outlookDateQuery,
  };
}
