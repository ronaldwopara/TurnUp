const GOOGLE_EVENT_EDIT_BASE = "https://calendar.google.com/calendar/u/0/r/eventedit";

export type GoogleCalendarDateInput = Date | string;

export type GoogleCalendarEventEditInput = {
  title: string;
  details?: string;
  location?: string;
  start: GoogleCalendarDateInput;
  end: GoogleCalendarDateInput;
  timezone: string;
  /** When true, `dates` uses `YYYYMMDD/YYYYMMDD` and the end date is exclusive (one day is added after the inclusive end). */
  isAllDay?: boolean;
  /** When > 1, `dates` is only the first day’s block and `recur=RRULE:FREQ=DAILY;COUNT=…` is appended. Ignored when `isAllDay` is true. */
  recurrenceDays?: number;
};

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

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function createZonedPartsReader(timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });

  return (instant: Date): ZonedParts => {
    const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
    for (const p of dtf.formatToParts(instant)) {
      if (p.type !== "literal") {
        parts[p.type] = p.value;
      }
    }
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      second: Number(parts.second),
    };
  };
}

function sameZonedWall(a: ZonedParts, b: ZonedParts): boolean {
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.hour === b.hour &&
    a.minute === b.minute &&
    a.second === b.second
  );
}

/**
 * Interprets `(year, month, day, hour, minute, second)` as wall clock in `timeZone` and returns the matching UTC instant.
 * Uses a bounded brute-force search around a UTC guess so it stays dependency-free and behaves on DST days.
 */
export function zonedWallClockToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0
): Date {
  const read = createZonedPartsReader(timeZone);
  const want: ZonedParts = { year, month, day, hour, minute, second };

  const center = Date.UTC(year, month - 1, day, hour, minute, second);
  const windowMinutes = 32 * 60;

  for (let dm = -windowMinutes; dm <= windowMinutes; dm++) {
    const instant = new Date(center + dm * 60 * 1000);
    if (sameZonedWall(read(instant), want)) {
      return instant;
    }
  }

  if (second !== 0) {
    const near = new Date(center);
    for (let ds = -120; ds <= 120; ds++) {
      const instant = new Date(near.getTime() + ds * 1000);
      if (sameZonedWall(read(instant), want)) {
        return instant;
      }
    }
  }

  throw new RangeError(
    `Could not resolve wall time ${year}-${month}-${day} ${hour}:${minute}:${second} in timezone "${timeZone}" (nonexistent local time during DST?).`
  );
}

export function getZonedYmd(timeZone: string, instant: Date): { year: number; month: number; day: number } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== "literal") {
      parts[p.type] = p.value;
    }
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

export function addCalendarDaysYmd(ymd: { year: number; month: number; day: number }, days: number): {
  year: number;
  month: number;
  day: number;
} {
  const utc = Date.UTC(ymd.year, ymd.month - 1, ymd.day + days);
  return {
    year: new Date(utc).getUTCFullYear(),
    month: new Date(utc).getUTCMonth() + 1,
    day: new Date(utc).getUTCDate(),
  };
}

function ymdToCompact(ymd: { year: number; month: number; day: number }): string {
  return `${ymd.year}${String(ymd.month).padStart(2, "0")}${String(ymd.day).padStart(2, "0")}`;
}

/** Formats an absolute instant as `YYYYMMDDTHHMMSS` wall clock in `timeZone` (for Google `dates` + `ctz`). */
export function formatGoogleTimedSegment(timeZone: string, instant: Date): string {
  const read = createZonedPartsReader(timeZone);
  const z = read(instant);
  return `${z.year}${String(z.month).padStart(2, "0")}${String(z.day).padStart(2, "0")}T${String(z.hour).padStart(2, "0")}${String(z.minute).padStart(2, "0")}${String(z.second).padStart(2, "0")}`;
}

/** `YYYY-MM-DDTHH:mm:ss` in `timeZone` (Outlook compose `startdt` / `enddt`). */
export function formatOutlookLocalDateTime(timeZone: string, instant: Date): string {
  const read = createZonedPartsReader(timeZone);
  const z = read(instant);
  return `${z.year}-${String(z.month).padStart(2, "0")}-${String(z.day).padStart(2, "0")}T${String(z.hour).padStart(2, "0")}:${String(z.minute).padStart(2, "0")}:${String(z.second).padStart(2, "0")}`;
}

function compareYmd(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number }
): number {
  if (a.year !== b.year) {
    return a.year - b.year;
  }
  if (a.month !== b.month) {
    return a.month - b.month;
  }
  return a.day - b.day;
}

/**
 * Builds a Google Calendar `eventedit` URL with `text`, `details`, `location`, `dates`, and `ctz`.
 * @see https://calendar.google.com/calendar/u/0/r/eventedit
 */
export function buildGoogleCalendarEventEditUrl(input: GoogleCalendarEventEditInput): string {
  const start = normalizeDateInput(input.start);
  const end = normalizeDateInput(input.end);
  const timezone = input.timezone.trim();
  if (!timezone) {
    throw new Error("Google Calendar timezone must be a non-empty IANA timezone string.");
  }

  const recurrenceDays = input.recurrenceDays;
  if (recurrenceDays != null && (!Number.isInteger(recurrenceDays) || recurrenceDays < 1)) {
    throw new Error("Google Calendar recurrenceDays must be a positive integer.");
  }

  if (input.isAllDay) {
    const startYmd = getZonedYmd(timezone, start);
    const endYmd = getZonedYmd(timezone, end);
    if (compareYmd(endYmd, startYmd) < 0) {
      throw new Error("Google Calendar all-day end date must be on or after the start date.");
    }
    const exclusiveEndYmd = addCalendarDaysYmd(endYmd, 1);
    const datesValue = `${ymdToCompact(startYmd)}/${ymdToCompact(exclusiveEndYmd)}`;
    return assembleGoogleEventEditUrl(input, datesValue, timezone, undefined);
  }

  if (recurrenceDays != null && recurrenceDays > 1) {
    if (end.getTime() <= start.getTime()) {
      throw new Error("Google Calendar end must be after start for timed events.");
    }
    const startSeg = getZonedYmd(timezone, start);
    const endParts = createZonedPartsReader(timezone)(end);
    let firstDayEndInstant = zonedWallClockToUtc(
      timezone,
      startSeg.year,
      startSeg.month,
      startSeg.day,
      endParts.hour,
      endParts.minute,
      endParts.second
    );
    if (firstDayEndInstant.getTime() <= start.getTime()) {
      const bumped = addCalendarDaysYmd(startSeg, 1);
      firstDayEndInstant = zonedWallClockToUtc(
        timezone,
        bumped.year,
        bumped.month,
        bumped.day,
        endParts.hour,
        endParts.minute,
        endParts.second
      );
    }
    const datesValue = `${formatGoogleTimedSegment(timezone, start)}/${formatGoogleTimedSegment(timezone, firstDayEndInstant)}`;
    return assembleGoogleEventEditUrl(input, datesValue, timezone, recurrenceDays);
  }

  if (end.getTime() <= start.getTime()) {
    throw new Error("Google Calendar end must be after start for timed events.");
  }

  const datesValue = `${formatGoogleTimedSegment(timezone, start)}/${formatGoogleTimedSegment(timezone, end)}`;
  return assembleGoogleEventEditUrl(input, datesValue, timezone, undefined);
}

function assembleGoogleEventEditUrl(
  input: GoogleCalendarEventEditInput,
  datesValue: string,
  timezone: string,
  recurrenceCount: number | undefined
): string {
  const params = new URLSearchParams();
  params.set("text", input.title);
  params.set("details", input.details ?? "");
  params.set("location", input.location ?? "");
  params.set("dates", datesValue);
  params.set("ctz", timezone);
  if (recurrenceCount != null && recurrenceCount > 1) {
    params.set("recur", `RRULE:FREQ=DAILY;COUNT=${recurrenceCount}`);
  }
  return `${GOOGLE_EVENT_EDIT_BASE}?${params.toString()}`;
}

export const googleCalendarEventEditBaseUrl = GOOGLE_EVENT_EDIT_BASE;
