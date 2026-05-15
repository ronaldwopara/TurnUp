import { z } from "zod";

import {
  addCalendarDaysYmd,
  buildGoogleCalendarEventEditUrl,
  formatOutlookLocalDateTime,
  googleCalendarEventEditBaseUrl,
  zonedWallClockToUtc,
} from "../googleCalendarUrl";

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

const GOOGLE_EVENT_EDIT_BASE = googleCalendarEventEditBaseUrl;
const OUTLOOK_BASE = "https://outlook.office.com/calendar/0/deeplink/compose";
const DEFAULT_TIMEZONE = "America/Edmonton";

function encodePart(value?: string): string {
  return encodeURIComponent(value ?? "");
}

export type { GoogleCalendarDateInput, GoogleCalendarEventEditInput } from "../googleCalendarUrl";
export { buildGoogleCalendarEventEditUrl } from "../googleCalendarUrl";

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

/** 4-digit calendar years we treat as explicit (not day/month fragments). */
function hasExplicitFourDigitYear(s: string): boolean {
  return /\b(19|20)\d{2}\b/.test(s);
}

function parseLooseDate(input: string): { year: number; month: number; day: number } | null {
  const normalized = input
    .trim()
    .replace(/(\d{1,2})(st|nd|rd|th)\b/gi, "$1")
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ");

  const tryParse = (candidate: string): { year: number; month: number; day: number } | null => {
    const parsed = new Date(candidate);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return {
      year: parsed.getFullYear(),
      month: parsed.getMonth() + 1,
      day: parsed.getDate(),
    };
  };

  if (hasExplicitFourDigitYear(normalized)) {
    return tryParse(normalized);
  }

  const currentYear = new Date().getFullYear();
  return (
    tryParse(`${normalized}, ${currentYear}`) ??
    tryParse(`${normalized} ${currentYear}`) ??
    tryParse(normalized)
  );
}

function parseMonthDayRange(input: string): {
  start: { year: number; month: number; day: number };
  end: { year: number; month: number; day: number };
} | null {
  const normalized = input.trim().replace(/\s+/g, " ");
  const rangeMatch = normalized.match(/^([A-Za-z]+)\s+(\d{1,2})\s*[-–—]\s*(\d{1,2}),\s*(\d{4})$/);
  if (rangeMatch) {
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

  const rangeNoYear = normalized.match(/^([A-Za-z]+)\s+(\d{1,2})\s*[-–—]\s*(\d{1,2})$/);
  if (!rangeNoYear) {
    return null;
  }

  const monthName = rangeNoYear[1];
  const startDay = Number(rangeNoYear[2]);
  const endDay = Number(rangeNoYear[3]);
  const year = new Date().getFullYear();

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

/** Pull trailing explicit years off the day list so digits from "2026" are not counted as days. */
function stripTrailingListYear(daySection: string): { rest: string; year: number | null } {
  let s = daySection.replace(/\s+/g, " ").trim();
  const ofYear = s.match(/\s+of\s+((?:19|20)\d{2})\s*$/i);
  if (ofYear) {
    const year = Number(ofYear[1]);
    s = s.slice(0, s.length - ofYear[0].length).trim();
    return { rest: s, year: Number.isFinite(year) ? year : null };
  }
  const commaYear = s.match(/,\s*((?:19|20)\d{2})\s*$/);
  if (commaYear) {
    const year = Number(commaYear[1]);
    s = s.replace(/,\s*(?:19|20)\d{2}\s*$/i, "").trim();
    return { rest: s, year: Number.isFinite(year) ? year : null };
  }
  const spaceYear = s.match(/\s+((?:19|20)\d{2})\s*$/);
  if (spaceYear) {
    const year = Number(spaceYear[1]);
    s = s.slice(0, s.length - spaceYear[0].length).trim();
    return { rest: s, year: Number.isFinite(year) ? year : null };
  }
  return { rest: s, year: null };
}

function parseMonthDayList(input: string): {
  start: { year: number; month: number; day: number };
  end: { year: number; month: number; day: number };
} | null {
  const normalized = input.trim().replace(/\s+/g, " ");
  const listMatch = normalized.match(/^([A-Za-z]+)\s+(.+)$/);
  if (!listMatch) {
    return null;
  }

  const monthName = listMatch[1];
  const { rest: daySectionRaw, year: explicitYear } = stripTrailingListYear(listMatch[2]);
  const daySectionNorm = daySectionRaw.replace(/\s+/g, " ").trim();
  if (/^\d{4}$/.test(daySectionNorm)) {
    return null;
  }
  // Single calendar date with year (e.g. "15th, 2025") — use parseLooseDate instead.
  if (/^\d{1,2}(?:st|nd|rd|th),\s*\d{4}$/i.test(daySectionNorm) || /^\d{1,2},\s*\d{4}$/.test(daySectionNorm)) {
    return null;
  }

  const year = explicitYear ?? new Date().getFullYear();

  const monthDate = new Date(`${monthName} 1, ${year}`);
  if (Number.isNaN(monthDate.getTime())) {
    return null;
  }

  const daySection = daySectionNorm.replace(/\s*&\s*/gi, " ");
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

function dateRangeSpansMultipleCalendarDays(range: {
  start: { year: number; month: number; day: number };
  end: { year: number; month: number; day: number };
}): boolean {
  return (
    range.start.year !== range.end.year ||
    range.start.month !== range.end.month ||
    range.start.day !== range.end.day
  );
}

/**
 * Returns the first candidate that `parseDateRange` resolves to more than one calendar day
 * (month/day lists, month ranges, or explicit `YYYY-MM-DD to YYYY-MM-DD` spans).
 */
export function tryPickMultiDayDateStringFromCandidates(candidates: string[]): string | null {
  for (const raw of candidates) {
    const trimmed = raw.replace(/\s+/g, " ").trim();
    if (!trimmed) {
      continue;
    }
    const range = parseDateRange(trimmed);
    if (range && dateRangeSpansMultipleCalendarDays(range)) {
      return trimmed;
    }
  }
  return null;
}

/** Scans OCR lines (then the full collapsed string) for a printable multi-day date. */
export function tryPickMultiDayDateStringFromOcrText(fullText: string): string | null {
  const lines = fullText
    .split(/\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const fromLine = tryPickMultiDayDateStringFromCandidates(lines);
  if (fromLine) {
    return fromLine;
  }
  const collapsed = fullText.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  return collapsed ? tryPickMultiDayDateStringFromCandidates([collapsed]) : null;
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

function inclusiveCalendarDayCount(
  start: { year: number; month: number; day: number },
  end: { year: number; month: number; day: number }
): number {
  const startMidnight = new Date(start.year, start.month - 1, start.day);
  const endMidnight = new Date(end.year, end.month - 1, end.day);
  const diffDays = Math.round((endMidnight.getTime() - startMidnight.getTime()) / 86400000);
  return diffDays + 1;
}

/** e.g. "Jan 6, 7, & 8" / "JAN 6, 7, & 8, 2026" / "Jan 6, 7 and 8" → same session each listed day (RRULE), not one continuous span. */
function dateStringSuggestsExplicitDayList(date?: string): boolean {
  if (!date?.trim()) {
    return false;
  }
  const s = date.trim();
  if (/\b\d{1,2}\s*,\s*\d{1,2}\s*,/.test(s)) {
    return true;
  }
  if (/\b\d{1,2}\s*&\s*\d{1,2}/.test(s)) {
    return true;
  }
  if (/\band\b/i.test(s) && /\b\d{1,2}\s*,\s*\d{1,2}\b/i.test(s)) {
    return true;
  }
  return false;
}

/** Both sides of "to" include a year and clock → usually one anchored span (not RRULE). */
function timeStringSuggestsContinuousMultiDaySpan(time?: string): boolean {
  if (!time?.trim()) {
    return false;
  }
  const normalized = time.replace(/\s+/g, " ").trim();
  const parts = normalized.split(/\s+to\s+/i).map((part) => part.trim());
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
    const startDate = zonedWallClockToUtc(
      DEFAULT_TIMEZONE,
      startDateParts.year,
      startDateParts.month,
      startDateParts.day,
      0,
      0,
      0
    );
    const endDate = zonedWallClockToUtc(
      DEFAULT_TIMEZONE,
      endDateParts.year,
      endDateParts.month,
      endDateParts.day,
      0,
      0,
      0
    );
    const outlookExclusiveYmd = addCalendarDaysYmd(endDateParts, 1);
    const outlookExclusiveEnd = zonedWallClockToUtc(
      DEFAULT_TIMEZONE,
      outlookExclusiveYmd.year,
      outlookExclusiveYmd.month,
      outlookExclusiveYmd.day,
      0,
      0,
      0
    );
    return {
      startsAt: event.date,
      startDate,
      endDate,
      isAllDay: true,
      outlookStart: formatOutlookLocalDateTime(DEFAULT_TIMEZONE, startDate),
      outlookEnd: formatOutlookLocalDateTime(DEFAULT_TIMEZONE, outlookExclusiveEnd),
    };
  }

  const spanDays = inclusiveCalendarDayCount(startDateParts, endDateParts);
  const explicitDayList = dateStringSuggestsExplicitDayList(event.date);
  const timeAnchorsDifferentDays = timeStringSuggestsContinuousMultiDaySpan(event.time);

  const useDailyRecurrence =
    spanDays > 1 &&
    (event.calendarSchedule !== "multi_day_continuous" || explicitDayList) &&
    !(event.calendarSchedule === "multi_day_continuous" && timeAnchorsDifferentDays && !explicitDayList);

  const blockStart = zonedWallClockToUtc(
    DEFAULT_TIMEZONE,
    startDateParts.year,
    startDateParts.month,
    startDateParts.day,
    timeRange.startHour,
    timeRange.startMinute,
    0
  );

  if (useDailyRecurrence) {
    let blockEndSameDay = zonedWallClockToUtc(
      DEFAULT_TIMEZONE,
      startDateParts.year,
      startDateParts.month,
      startDateParts.day,
      timeRange.endHour,
      timeRange.endMinute,
      0
    );
    if (blockEndSameDay.getTime() <= blockStart.getTime()) {
      const nextDay = addCalendarDaysYmd(
        { year: startDateParts.year, month: startDateParts.month, day: startDateParts.day },
        1
      );
      blockEndSameDay = zonedWallClockToUtc(
        DEFAULT_TIMEZONE,
        nextDay.year,
        nextDay.month,
        nextDay.day,
        timeRange.endHour,
        timeRange.endMinute,
        0
      );
    }

    return {
      startsAt: `${event.date} ${event.time ?? ""}`.trim(),
      startDate: blockStart,
      endDate: blockEndSameDay,
      isAllDay: false,
      recurrenceDays: spanDays,
      outlookStart: formatOutlookLocalDateTime(DEFAULT_TIMEZONE, blockStart),
      outlookEnd: formatOutlookLocalDateTime(DEFAULT_TIMEZONE, blockEndSameDay),
    };
  }

  let endDate = zonedWallClockToUtc(
    DEFAULT_TIMEZONE,
    endDateParts.year,
    endDateParts.month,
    endDateParts.day,
    timeRange.endHour,
    timeRange.endMinute,
    0
  );
  if (endDate.getTime() <= blockStart.getTime()) {
    const endPlus = addCalendarDaysYmd(endDateParts, 1);
    endDate = zonedWallClockToUtc(
      DEFAULT_TIMEZONE,
      endPlus.year,
      endPlus.month,
      endPlus.day,
      timeRange.endHour,
      timeRange.endMinute,
      0
    );
  }

  return {
    startsAt: `${event.date} ${event.time ?? ""}`.trim(),
    startDate: blockStart,
    endDate,
    isAllDay: false,
    outlookStart: formatOutlookLocalDateTime(DEFAULT_TIMEZONE, blockStart),
    outlookEnd: formatOutlookLocalDateTime(DEFAULT_TIMEZONE, endDate),
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
