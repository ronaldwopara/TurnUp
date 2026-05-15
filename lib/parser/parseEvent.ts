import * as chrono from "chrono-node";

// #region agent log
function agentParseDebugLog(input: {
  hypothesisId: string;
  message: string;
  data: Record<string, unknown>;
}): void {
  fetch("http://127.0.0.1:7859/ingest/7319e680-e2cf-49d4-94cf-f4744c2b85e4", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "4a809f" },
    body: JSON.stringify({
      sessionId: "4a809f",
      location: "lib/parser/parseEvent.ts",
      message: input.message,
      hypothesisId: input.hypothesisId,
      data: input.data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

type ScoredCandidate = {
  line: string;
  score: number;
};

type DateDetection = {
  start?: Date;
  end?: Date;
  rawMatches: string[];
  lineIndexes: number[];
  ambiguities: string[];
};

type LocationDetection = {
  value?: string;
  lineIndexes: number[];
  candidates: string[];
  ambiguities: string[];
  confidence: number;
};

export type ParsedEvent = {
  title?: string;
  start?: Date;
  end?: Date;
  location?: string;
  description?: string;
  confidence: number;
  warnings?: string[];
  debug?: {
    titleCandidates?: string[];
    detectedDates?: string[];
    detectedLocations?: string[];
    confidenceBreakdown?: Record<string, number>;
  };
};

const MONTH_OR_WEEKDAY_RE =
  /\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/i;
/** OCR often drops the space between month and day ("JAN6"), so `\bjan\b` never matches. */
const GLUED_MONTH_DAY_RE =
  /(?:^|[^a-z])(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)(?=\d)/i;
const TIME_RE = /\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/i;
const ADDRESS_HINT_RE =
  /\b(street|st\.?|road|rd\.?|ave|avenue|blvd|boulevard|drive|dr\.?|lane|ln\.?|hall|room|centre|center|building|campus|suite|unit)\b/i;
const URL_OR_EMAIL_RE = /(https?:\/\/|www\.|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
const POSTAL_CODE_RE = /\b([A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d|\d{5}(?:-\d{4})?)\b/;

function normalizeInputText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function normalizeLines(text: string): string[] {
  return normalizeInputText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function alphaRatio(line: string): number {
  const alphaCount = (line.match(/[a-z]/gi) ?? []).length;
  return alphaCount / Math.max(1, line.length);
}

function numericRatio(line: string): number {
  const numericCount = (line.match(/\d/g) ?? []).length;
  return numericCount / Math.max(1, line.length);
}

function titleCaseLike(line: string): boolean {
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return false;
  }
  const titledWords = words.filter((word) => /^[A-Z][a-z]/.test(word)).length;
  return titledWords >= Math.ceil(words.length / 2);
}

function scoreTitleCandidate(line: string, index: number): number {
  if (line.length < 2 || line.length > 60) {
    return -100;
  }

  let score = 0;
  const isUpper = line === line.toUpperCase() && /[A-Z]/.test(line);
  const ratioAlpha = alphaRatio(line);
  const ratioNumeric = numericRatio(line);

  score += Math.max(0, 24 - index * 4);
  if (ratioAlpha >= 0.5) score += 14;
  if (ratioNumeric > 0.4) score -= 16;
  if (isUpper || titleCaseLike(line)) score += 10;
  if (line.length >= 6 && line.length <= 32) score += 8;
  if (line.split(/\s+/).length <= 8) score += 5;

  if (TIME_RE.test(line)) score -= 14;
  if (MONTH_OR_WEEKDAY_RE.test(line)) score -= 16;
  if (ADDRESS_HINT_RE.test(line)) score -= 10;
  if (URL_OR_EMAIL_RE.test(line)) score -= 20;
  if (POSTAL_CODE_RE.test(line)) score -= 8;
  if (/^\d[\d\s\-:/]+$/.test(line)) score -= 25;

  return score;
}

function scoreTitleCandidates(lines: string[]): { value?: string; line?: number; score: number; candidates: string[] } {
  const scored: Array<ScoredCandidate & { index: number }> = lines.map((line, index) => ({
    line,
    index,
    score: scoreTitleCandidate(line, index),
  }));

  const ranked = scored.sort((a, b) => b.score - a.score);
  const top = ranked[0];
  if (!top || top.score <= 0) {
    return { score: 0, candidates: ranked.slice(0, 5).map((entry) => `${entry.line} (${entry.score})`) };
  }

  return {
    value: top.line,
    line: top.index,
    score: top.score,
    candidates: ranked.slice(0, 5).map((entry) => `${entry.line} (${entry.score})`),
  };
}

function parseClockToken(token: string, fallbackMeridiem?: "am" | "pm"): { hour: number; minute: number } | null {
  const normalized = token.trim().toLowerCase().replace(/\./g, "");
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = (match[3] as "am" | "pm" | undefined) ?? fallbackMeridiem;
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) return null;

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    hour = meridiem === "am" ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
  } else if (hour > 23) {
    return null;
  }

  return { hour, minute };
}

function extractTimeRangeFromText(text: string): { startHour: number; startMinute: number; endHour: number; endMinute: number } | null {
  const match = text
    .replace(/[–—]/g, "-")
    .match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (!match) return null;
  const startRaw = match[1] ?? "";
  const endRaw = match[2] ?? "";
  const startMeridiem = (startRaw.toLowerCase().match(/\b(am|pm)\b/)?.[1] ?? undefined) as "am" | "pm" | undefined;
  const endMeridiem = (endRaw.toLowerCase().match(/\b(am|pm)\b/)?.[1] ?? undefined) as "am" | "pm" | undefined;
  const start = parseClockToken(startRaw, startMeridiem ?? endMeridiem);
  const end = parseClockToken(endRaw, endMeridiem ?? startMeridiem);
  if (!start || !end) return null;

  return {
    startHour: start.hour,
    startMinute: start.minute,
    endHour: end.hour,
    endMinute: end.minute,
  };
}

/** Chrono can assign spurious certainty to junk OCR (e.g. "a\\ny"); never rank those as primary (debug session 4a809f). */
function chronoMatchedTextPlausible(text: string): boolean {
  const t = text.replace(/\r\n/g, "\n").trim();
  if (t.length < 3) return false;
  const alnum = (t.match(/[a-z0-9]/gi) ?? []).length;
  if (alnum < 3) return false;
  const segs = t.split(/\n/).map((s) => s.trim()).filter(Boolean);
  if (segs.length > 0 && segs.every((s) => s.length <= 2)) return false;
  if (/\d/.test(t)) return true;
  if (TIME_RE.test(t)) return true;
  if (MONTH_OR_WEEKDAY_RE.test(t) && t.replace(/\s+/g, " ").length >= 5) return true;
  return false;
}

/** Prefer real calendar anchors over "today at 10AM" style chrono hits (see debug H1). */
function chronoCalendarStrength(result: chrono.ParsedResult): number {
  const s = result.start;
  let n = 0;
  if (s.isCertain("year")) n += 100;
  if (s.isCertain("month")) n += 40;
  if (s.isCertain("day")) n += 40;
  if (/\b20\d{2}\b/.test(result.text)) n += 35;
  return n;
}

function dedupeChronoResults(results: chrono.ParsedResult[]): chrono.ParsedResult[] {
  const seen = new Set<string>();
  const out: chrono.ParsedResult[] = [];
  for (const r of results) {
    const key = `${r.text}|${r.start.date().getTime()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function lineLikelyContainsCalendarDate(line: string): boolean {
  if (/\d/.test(line) && GLUED_MONTH_DAY_RE.test(line)) {
    return true;
  }
  return MONTH_OR_WEEKDAY_RE.test(line) && /\d/.test(line);
}

/** When OCR includes a literal `20xx`, honor it over chrono `forwardDate` rolling past that year. */
function snapDatesToExplicitFourDigitYearInText(
  matchText: string,
  start: Date,
  end?: Date,
): { start: Date; end?: Date } {
  const m = matchText.match(/\b(20\d{2})\b/);
  if (!m) return { start, end };
  const y = Number(m[1]);
  if (!Number.isFinite(y)) return { start, end };
  const s = new Date(start);
  if (s.getFullYear() !== y) s.setFullYear(y);
  const e = end ? new Date(end) : undefined;
  if (e && e.getFullYear() !== y) e.setFullYear(y);
  return { start: s, end: e };
}

function uniqueFourDigitYearsInText(text: string): number[] {
  const matches = text.match(/\b20\d{2}\b/g) ?? [];
  const uniq = new Set<number>();
  for (const raw of matches) {
    const y = Number(raw);
    if (Number.isFinite(y)) uniq.add(y);
  }
  return Array.from(uniq);
}

/** Lines that are clearly a calendar block, not a venue (debug: date line was winning locationScore). */
function looksLikeDateScheduleLine(line: string): boolean {
  if (/\b20\d{2}\b/.test(line) && MONTH_OR_WEEKDAY_RE.test(line)) return true;
  if (/\b20\d{2}\b/.test(line) && GLUED_MONTH_DAY_RE.test(line)) return true;
  if (TIME_RE.test(line) && MONTH_OR_WEEKDAY_RE.test(line)) return true;
  if (TIME_RE.test(line) && GLUED_MONTH_DAY_RE.test(line)) return true;
  if (GLUED_MONTH_DAY_RE.test(line) && /\d/.test(line)) {
    if (/\d{1,2}(?:st|nd|rd|th)\b/i.test(line)) return true;
    if (/\d{1,2}\s*[,;&]\s*\d/i.test(line)) return true;
    if (/\d{1,2}\s*([,;&]|\band\b|[\u2013\-])\s*\d/i.test(line)) return true;
    if (/\b20\d{2}\b/.test(line)) return true;
  }
  if (MONTH_OR_WEEKDAY_RE.test(line) && /\d/.test(line)) {
    if (/\d{1,2}(?:st|nd|rd|th)\b/i.test(line)) return true;
    if (/\d{1,2}\s*([,;&]|\band\b|[\u2013\-])\s*\d/i.test(line)) return true;
  }
  return false;
}

/** Chrono primary.text can span newlines; no single OCR line includes it, so we match meaningful chunks (log H3). */
function lineIndexesMatchingChronoPrimary(lines: string[], primaryText: string): number[] {
  const primaryLow = primaryText.toLowerCase().trim();
  const direct = lines
    .map((line, index) => (line.toLowerCase().includes(primaryLow) ? index : -1))
    .filter((i) => i >= 0);
  if (direct.length > 0) return direct;

  const chunks = primaryText
    .split(/\n/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && (/\d/.test(s) || MONTH_OR_WEEKDAY_RE.test(s) || GLUED_MONTH_DAY_RE.test(s)))
    .map((s) => s.toLowerCase());
  if (chunks.length === 0) return [];

  const seen = new Set<number>();
  lines.forEach((line, index) => {
    const low = line.toLowerCase();
    if (chunks.some((c) => low.includes(c))) seen.add(index);
  });
  return Array.from(seen).sort((a, b) => a - b);
}

/** If the flyer clearly prints one year (possibly repeated), lock parsed instants to it when chrono left the year open. */
function snapDatesToUniqueOcrYearIfUnambiguous(
  fullText: string,
  result: chrono.ParsedResult,
  start: Date,
  end?: Date,
): { start: Date; end?: Date } {
  if (result.start.isCertain("year")) return { start, end };
  const years = uniqueFourDigitYearsInText(fullText);
  if (years.length !== 1) return { start, end };
  const y = years[0]!;
  const s = new Date(start);
  if (s.getFullYear() !== y) s.setFullYear(y);
  const e = end ? new Date(end) : undefined;
  if (e && e.getFullYear() !== y) e.setFullYear(y);
  return { start: s, end: e };
}

function detectDateTime(lines: string[], text: string, referenceDate: Date): DateDetection {
  const parsedFull = chrono.parse(text, referenceDate, { forwardDate: true });
  const parsedFromLines: chrono.ParsedResult[] = [];
  for (const line of lines) {
    if (line.length < 4 || !lineLikelyContainsCalendarDate(line)) continue;
    parsedFromLines.push(...chrono.parse(line, referenceDate, { forwardDate: true }));
  }
  const merged = dedupeChronoResults([...parsedFull, ...parsedFromLines]);
  const parsed = merged.filter((r) => chronoMatchedTextPlausible(r.text));
  if (parsed.length === 0) {
    // #region agent log
    agentParseDebugLog({
      hypothesisId: "H1_H5",
      message: "detectDateTime",
      data: {
        refIso: referenceDate.toISOString(),
        chronoMergedCount: merged.length,
        chronoPlausibleCount: 0,
        noPlausibleChrono: true,
      },
    });
    // #endregion
    return { rawMatches: [], lineIndexes: [], ambiguities: ["No date/time detected in text."] };
  }

  const ranked = parsed
    .map((result) => {
      const start = result.start.date();
      const end = result.end?.date();
      const isFutureish = start.getTime() >= referenceDate.getTime() ? 1 : 0;
      const calendarStrength = chronoCalendarStrength(result);
      return { result, start, end, isFutureish, calendarStrength };
    })
    .sort((a, b) => {
      if (a.calendarStrength !== b.calendarStrength) return b.calendarStrength - a.calendarStrength;
      if (a.isFutureish !== b.isFutureish) return b.isFutureish - a.isFutureish;
      return a.start.getTime() - b.start.getTime();
    });

  const primary = ranked[0];
  const rawMatches = ranked.map((entry) => entry.result.text);
  const lineIndexes = lineIndexesMatchingChronoPrimary(lines, primary.result.text);

  let start = primary.start;
  let end = primary.end;
  const snappedMatch = snapDatesToExplicitFourDigitYearInText(primary.result.text, start, end);
  start = snappedMatch.start;
  end = snappedMatch.end;
  const snappedDoc = snapDatesToUniqueOcrYearIfUnambiguous(text, primary.result, start, end);
  start = snappedDoc.start;
  end = snappedDoc.end;

  let timeRangeSource: "none" | "primary" | "fulltext" = "none";
  if (!end) {
    const fromPrimary = extractTimeRangeFromText(primary.result.text);
    const fromFull = fromPrimary ? null : extractTimeRangeFromText(text);
    const range = fromPrimary ?? fromFull;
    if (fromPrimary) timeRangeSource = "primary";
    else if (fromFull) timeRangeSource = "fulltext";
    if (range) {
      const maybeStart = new Date(start);
      maybeStart.setHours(range.startHour, range.startMinute, 0, 0);
      const maybeEnd = new Date(start);
      maybeEnd.setHours(range.endHour, range.endMinute, 0, 0);
      if (maybeEnd.getTime() <= maybeStart.getTime()) {
        maybeEnd.setDate(maybeEnd.getDate() + 1);
      }
      start = maybeStart;
      end = maybeEnd;
    }
  }

  const ambiguities: string[] = [];
  if (ranked.length > 1) {
    ambiguities.push("Multiple date candidates detected.");
  }
  if (!end && !primary.result.start.isCertain("hour")) {
    ambiguities.push("Start time was not explicit.");
  }

  // #region agent log
  agentParseDebugLog({
    hypothesisId: "H1_H5",
    message: "detectDateTime",
    data: {
      refIso: referenceDate.toISOString(),
      chronoMergedCount: merged.length,
      chronoPlausibleCount: parsed.length,
      chronoTop: ranked.slice(0, 10).map((e) => ({
        text: e.result.text,
        startIso: e.start.toISOString(),
        isFutureish: e.isFutureish,
        calendarStrength: e.calendarStrength,
        certainYear: e.result.start.isCertain("year"),
        certainMonth: e.result.start.isCertain("month"),
        certainDay: e.result.start.isCertain("day"),
        certainHour: e.result.start.isCertain("hour"),
      })),
      primaryText: primary.result.text,
      finalStartIso: start?.toISOString(),
      finalEndIso: end?.toISOString(),
      timeRangeSource,
      hadEndFromChrono: Boolean(primary.end),
      dateLineIndexes: lineIndexes,
    },
  });
  // #endregion

  return { start, end, rawMatches, lineIndexes, ambiguities };
}

/** Text after the last clock time (e.g. "... 3PM ETLCSolarium") — common when OCR merges schedule + venue on one line. */
function extractEmbeddedVenueFromLine(line: string): string | null {
  const normalized = line.replace(/\s+/g, " ").trim();
  const matches = [...normalized.matchAll(/\d{1,2}(?::\d{2})?\s*(AM|PM)\b/gi)];
  if (matches.length === 0) {
    return null;
  }
  const last = matches[matches.length - 1]!;
  const endPos = (last.index ?? 0) + last[0].length;
  const tail = normalized.slice(endPos).trim();
  if (tail.length < 3 || tail.length > 120) {
    return null;
  }
  if (TIME_RE.test(tail)) {
    return null;
  }
  if (looksLikeDateScheduleLine(tail)) {
    return null;
  }
  if (URL_OR_EMAIL_RE.test(tail)) {
    return null;
  }
  const letters = (tail.match(/[a-z]/gi) ?? []).length;
  if (letters / tail.length < 0.45) {
    return null;
  }
  return tail;
}

function embeddedVenueScore(parentLine: string, tail: string, index: number): number {
  if (tail.length < 3 || tail.length > 120) {
    return -100;
  }
  if (looksLikeDateScheduleLine(tail) || GLUED_MONTH_DAY_RE.test(tail)) {
    return -100;
  }
  if (!/\d{1,2}(?::\d{2})?\s*(?:AM|PM)\b/i.test(parentLine)) {
    return -100;
  }

  let score = 18;
  if (/\b20\d{2}\b/.test(parentLine)) {
    score += 8;
  }
  if (ADDRESS_HINT_RE.test(tail)) {
    score += 14;
  }
  if (POSTAL_CODE_RE.test(tail)) {
    score += 8;
  }
  if (/\s/.test(tail)) {
    score += 6;
  }
  if (/[a-z][A-Z]/.test(tail)) {
    score += 4;
  }
  score += Math.max(0, 8 - index);
  return score;
}

function locationScore(line: string, index: number): number {
  if (line.length < 4 || line.length > 120) return -100;
  if (URL_OR_EMAIL_RE.test(line)) return -100;
  if (looksLikeDateScheduleLine(line)) return -100;

  let score = 0;
  if (/\bat\b/i.test(line)) score += 9;
  if (/\b(located at|location|venue|where)\b/i.test(line)) score += 14;
  if (ADDRESS_HINT_RE.test(line)) score += 14;
  if (POSTAL_CODE_RE.test(line)) score += 10;
  if (line.includes(",")) score += 4;
  if (MONTH_OR_WEEKDAY_RE.test(line) || GLUED_MONTH_DAY_RE.test(line) || TIME_RE.test(line)) score -= 8;
  score += Math.max(0, 8 - index);
  return score;
}

function detectLocation(lines: string[]): LocationDetection {
  const scored: Array<{ line: string; index: number; score: number }> = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    const fullScore = locationScore(line, index);
    if (fullScore > 0) {
      scored.push({ line, index, score: fullScore });
    }

    const embedded = extractEmbeddedVenueFromLine(line);
    if (embedded) {
      const embScore = embeddedVenueScore(line, embedded, index);
      if (embScore > 0) {
        scored.push({ line: embedded, index, score: embScore });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      lineIndexes: [],
      candidates: [],
      ambiguities: ["No location candidate detected."],
      confidence: 0,
    };
  }

  const top = scored[0];
  const ambiguities: string[] = [];
  if (scored.length > 1 && scored[1].score >= top.score - 2) {
    ambiguities.push("Location appears ambiguous.");
  }

  return {
    value: top.line,
    lineIndexes: [top.index],
    candidates: scored.slice(0, 5).map((entry) => `${entry.line} (${entry.score})`),
    ambiguities,
    confidence: Math.min(100, top.score * 4),
  };
}

function isMeaningfulDescriptionLine(line: string): boolean {
  if (line.length < 4) return false;
  if (URL_OR_EMAIL_RE.test(line)) return false;
  if (/^[\W_]+$/.test(line)) return false;
  return true;
}

function buildDescription(lines: string[], consumedLineIndexes: Set<number>): string | undefined {
  const leftover = lines
    .map((line, index) => ({ line, index }))
    .filter((entry) => !consumedLineIndexes.has(entry.index))
    .map((entry) => entry.line)
    .filter(isMeaningfulDescriptionLine);

  if (leftover.length === 0) return undefined;
  return leftover.join(" ").replace(/\s+/g, " ").trim().slice(0, 500);
}

function scoreConfidence(input: {
  titleScore: number;
  hasStart: boolean;
  hasEnd: boolean;
  hasLocation: boolean;
  corroboratingSignals: number;
  ambiguityCount: number;
}): { value: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {
    validDate: input.hasStart ? 30 : 0,
    endDetected: input.hasEnd ? 20 : 0,
    titleQuality: Math.max(0, Math.min(20, Math.round(input.titleScore))),
    locationQuality: input.hasLocation ? 15 : 0,
    corroboration: Math.min(15, input.corroboratingSignals * 5),
    ambiguityPenalty: -Math.min(25, input.ambiguityCount * 6),
  };

  const value = Math.max(
    0,
    Math.min(
      100,
      Object.values(breakdown).reduce((sum, current) => sum + current, 0),
    ),
  );

  return { value, breakdown };
}

export function parseEvent(text: string): ParsedEvent {
  const cleanedText = normalizeInputText(text);
  const lines = normalizeLines(cleanedText);
  const title = scoreTitleCandidates(lines);
  const dateDetection = detectDateTime(lines, cleanedText, new Date());
  const locationDetection = detectLocation(lines);

  const consumed = new Set<number>();
  if (typeof title.line === "number") consumed.add(title.line);
  dateDetection.lineIndexes.forEach((index) => consumed.add(index));
  locationDetection.lineIndexes.forEach((index) => consumed.add(index));

  const description = buildDescription(lines, consumed);
  const corroboratingSignals = [
    title.value ? 1 : 0,
    dateDetection.start ? 1 : 0,
    dateDetection.end ? 1 : 0,
    locationDetection.value ? 1 : 0,
    description ? 1 : 0,
  ].reduce((sum, item) => sum + item, 0);

  const confidence = scoreConfidence({
    titleScore: title.score,
    hasStart: Boolean(dateDetection.start),
    hasEnd: Boolean(dateDetection.end),
    hasLocation: Boolean(locationDetection.value),
    corroboratingSignals,
    ambiguityCount: dateDetection.ambiguities.length + locationDetection.ambiguities.length,
  });

  const warnings: string[] = [];
  if (!title.value) warnings.push("Title could not be confidently identified.");
  if (!dateDetection.start) warnings.push("Start date/time could not be confidently identified.");
  if (!locationDetection.value) warnings.push("Location could not be confidently identified.");
  warnings.push(...dateDetection.ambiguities, ...locationDetection.ambiguities);
  if (confidence.value < 60) warnings.push("Low confidence extraction. Manual review required.");

  // #region agent log
  agentParseDebugLog({
    hypothesisId: "H2_H3_H4",
    message: "parseEvent.summary",
    data: {
      lineCount: lines.length,
      title: title.value ?? null,
      titleLine: title.line ?? null,
      titleScore: title.score,
      location: locationDetection.value ?? null,
      dateStartIso: dateDetection.start?.toISOString() ?? null,
      dateEndIso: dateDetection.end?.toISOString() ?? null,
      consumedLineIndexes: Array.from(consumed).sort((a, b) => a - b),
      descriptionPreview: description ? description.slice(0, 220) : null,
      warnings: warnings.slice(0, 12),
    },
  });
  // #endregion

  return {
    title: title.value,
    start: dateDetection.start,
    end: dateDetection.end,
    location: locationDetection.value,
    description,
    confidence: confidence.value,
    warnings: Array.from(new Set(warnings)),
    debug: {
      titleCandidates: title.candidates,
      detectedDates: dateDetection.rawMatches,
      detectedLocations: locationDetection.candidates,
      confidenceBreakdown: confidence.breakdown,
    },
  };
}
