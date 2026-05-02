import { describe, expect, it } from "vitest";
import { buildCalendarPayload, eventPayloadSchema, extractionResultSchema } from "../lib/extraction/eventSchema";

describe("event payload schema", () => {
  it("validates required title", () => {
    const parsed = eventPayloadSchema.safeParse({
      title: "Campus Hack Night",
      date: "2026-09-12",
      time: "18:00",
      location: "Innovation Hall",
      description: "Bring your laptop.",
      confidence: 0.88,
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts null for optional event fields after normalization", () => {
    const parsed = extractionResultSchema.safeParse({
      extractedText: "Free pizza at noon",
      event: {
        title: "Welcome Week Mixer",
        date: null,
        time: null,
        location: null,
        description: null,
        confidence: 0.72,
      },
      ambiguityNotes: [],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.event.date).toBeUndefined();
      expect(parsed.data.event.description).toBeUndefined();
      expect(parsed.data.event.confidence).toBe(0.72);
    }
  });

  it("builds calendar links", () => {
    const payload = buildCalendarPayload({
      title: "Open Mic Night",
      location: "Student Union Building",
      description: "Community performances",
      confidence: 0.9,
    });

    expect(payload.googleCalendarUrl).toContain("calendar.google.com");
    expect(payload.outlookCalendarUrl).toContain("outlook.office.com");
  });
});
