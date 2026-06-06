import { describe, expect, it } from "vitest";
import { buildCalendarPayload } from "../lib/extraction/eventSchema";
import { parseTextToExtractionResult } from "../lib/eventExtraction/extractEventFromText";

describe("parseTextToExtractionResult + calendar payload", () => {
  it("preserves multi-day list from OCR-style text so Google Calendar gets RRULE", () => {
    const text = "ESS CAREER FAIR 2026\n10AM - 3PM\nJAN 6, 7, & 8, 2026\nETLC Solarium";
    const { extractionResult } = parseTextToExtractionResult(text);
    expect(extractionResult.event.date).toContain("JAN 6");
    expect(extractionResult.event.calendarSchedule).toBe("daily_same_hours");
    const payload = buildCalendarPayload({
      title: extractionResult.event.title,
      date: extractionResult.event.date,
      time: extractionResult.event.time,
      location: extractionResult.event.location,
      description: extractionResult.event.description,
      confidence: extractionResult.event.confidence,
      calendarSchedule: extractionResult.event.calendarSchedule,
    });
    expect(payload.googleCalendarUrl).toContain("recur=RRULE%3AFREQ%3DDAILY%3BCOUNT%3D3");
  });

  it("treats explicit start/end datetimes on one line as a continuous multi-day span", () => {
    const { extractionResult } = parseTextToExtractionResult(
      "Workshop\nJan 6, 2026 9:00 AM to Jan 8, 2026 5:00 PM\nLab",
    );
    expect(extractionResult.event.date).toMatch(/Jan 6, 2026.*Jan 8, 2026/);
    expect(extractionResult.event.calendarSchedule).toBe("multi_day_continuous");
  });
});
