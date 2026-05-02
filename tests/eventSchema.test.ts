import { describe, expect, it } from "vitest";
import {
  buildCalendarPayload,
  buildGoogleCalendarEventEditUrl,
  eventPayloadSchema,
  extractionResultSchema,
} from "../lib/extraction/eventSchema";

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
        calendarSchedule: null,
        confidence: 0.72,
      },
      ambiguityNotes: [],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.event.date).toBeUndefined();
      expect(parsed.data.event.description).toBeUndefined();
      expect(parsed.data.event.calendarSchedule).toBeUndefined();
      expect(parsed.data.event.confidence).toBe(0.72);
    }
  });

  it("builds calendar links with eventedit", () => {
    const payload = buildCalendarPayload({
      title: "Open Mic Night",
      location: "Student Union Building",
      description: "Community performances",
      confidence: 0.9,
    });

    expect(payload.googleCalendarUrl).toContain("calendar.google.com");
    expect(payload.googleCalendarUrl).toContain("/eventedit");
    expect(payload.outlookCalendarUrl).toContain("outlook.office.com");
  });

  it("adds timed start/end when date and time are provided", () => {
    const payload = buildCalendarPayload({
      title: "Open Mic Night",
      date: "2026-10-04",
      time: "7:30 PM",
      location: "Student Union Building",
      description: "Community performances",
      confidence: 0.9,
    });

    expect(payload.googleCalendarUrl).toContain("dates=20261004T193000%2F20261004T213000");
    expect(payload.googleCalendarUrl).toContain("ctz=America%2FEdmonton");
    expect(payload.outlookCalendarUrl).toContain("startdt=2026-10-04T19%3A30%3A00");
    expect(payload.outlookCalendarUrl).toContain("enddt=2026-10-04T21%3A30%3A00");
  });

  it("parses ordinal dates and unicode dash time ranges", () => {
    const payload = buildCalendarPayload({
      title: "UAlberta BESA Annual General Meeting",
      date: "September 15th, 2025",
      time: "5:30–7:00 PM",
      location: "CCIS 1-160",
      description: "AGM event",
      confidence: 0.8,
    });

    expect(payload.googleCalendarUrl).toContain("dates=20250915T173000%2F20250915T190000");
    expect(payload.googleCalendarUrl).toContain("ctz=America%2FEdmonton");
  });

  it("adds all-day dates when time is missing", () => {
    const payload = buildCalendarPayload({
      title: "Campus Fair",
      date: "2026-10-04",
      location: "Main Quad",
      description: "Clubs and community booths",
      confidence: 0.8,
    });

    expect(payload.googleCalendarUrl).toContain("dates=20261004%2F20261005");
    expect(payload.outlookCalendarUrl).toContain("startdt=2026-10-04T00%3A00%3A00");
    expect(payload.outlookCalendarUrl).toContain("enddt=2026-10-05T00%3A00%3A00");
  });

  it("parses month-day range strings for all-day span", () => {
    const payload = buildCalendarPayload({
      title: "Career Fair Week",
      date: "Jan 15-17, 2026",
      location: "ETLC Solarium",
      description: "Networking and job opportunities",
      confidence: 0.9,
    });

    expect(payload.googleCalendarUrl).toContain("dates=20260115%2F20260118");
    expect(payload.outlookCalendarUrl).toContain("startdt=2026-01-15T00%3A00%3A00");
    expect(payload.outlookCalendarUrl).toContain("enddt=2026-01-18T00%3A00%3A00");
  });

  it("parses month day list strings", () => {
    const payload = buildCalendarPayload({
      title: "Career Fair",
      date: "Jan 6, 7, and 8 of 2026",
      location: "ETLC Solarium",
      description: "Networking and job opportunities",
      confidence: 0.9,
    });

    expect(payload.googleCalendarUrl).toContain("dates=20260106%2F20260109");
    expect(payload.outlookCalendarUrl).toContain("startdt=2026-01-06T00%3A00%3A00");
    expect(payload.outlookCalendarUrl).toContain("enddt=2026-01-09T00%3A00%3A00");
  });

  it("uses RRULE for multi-day timed events by default", () => {
    const payload = buildCalendarPayload({
      title: "ESS Career Fair",
      date: "Jan 6-8, 2026",
      time: "10:00 AM - 3:00 PM",
      location: "ETLC Solarium",
      description: "Networking and recruiting.",
      confidence: 0.9,
    });

    expect(payload.googleCalendarUrl).toContain("dates=20260106T100000%2F20260106T150000");
    expect(payload.googleCalendarUrl).toContain("recur=RRULE%3AFREQ%3DDAILY%3BCOUNT%3D3");
  });

  it("uses spanning timed block when calendarSchedule is multi_day_continuous", () => {
    const payload = buildCalendarPayload({
      title: "Winter Retreat",
      date: "Jan 6-8, 2026",
      time: "9:00 AM - 5:00 PM",
      calendarSchedule: "multi_day_continuous",
      location: "Mountain Lodge",
      description: "One continuous retreat block.",
      confidence: 0.85,
    });

    expect(payload.googleCalendarUrl).toContain("dates=20260106T090000%2F20260108T170000");
    expect(payload.googleCalendarUrl).not.toContain("recur=");
  });

  it("builds eventedit URL from Date inputs", () => {
    const url = buildGoogleCalendarEventEditUrl({
      title: "ESS Career Fair 2026",
      details: "A career fair event organized by ESS for networking and job opportunities.",
      location: "ETLC Solarium",
      start: new Date(2026, 8, 15, 10, 0, 0),
      end: new Date(2026, 8, 15, 15, 0, 0),
      timezone: "America/Edmonton",
    });

    expect(url).toContain("calendar.google.com/calendar/u/0/r/eventedit");
    expect(url).toContain("dates=20260915T100000%2F20260915T150000");
    expect(url).toContain("ctz=America%2FEdmonton");
  });

  it("builds all-day multi-day with exclusive end", () => {
    const url = buildGoogleCalendarEventEditUrl({
      title: "Career Fair Week",
      details: "Networking and recruiting",
      location: "ETLC Solarium",
      start: new Date(2026, 0, 6, 0, 0, 0),
      end: new Date(2026, 0, 8, 0, 0, 0),
      timezone: "America/Edmonton",
      isAllDay: true,
    });

    expect(url).toContain("dates=20260106%2F20260109");
  });

  it("builds recurring daily with RRULE", () => {
    const url = buildGoogleCalendarEventEditUrl({
      title: "ESS Career Fair",
      start: new Date(2026, 0, 6, 10, 0, 0),
      end: new Date(2026, 0, 8, 15, 0, 0),
      timezone: "America/Edmonton",
      recurrenceDays: 3,
    });

    expect(url).toContain("dates=20260106T100000%2F20260106T150000");
    expect(url).toContain("recur=RRULE%3AFREQ%3DDAILY%3BCOUNT%3D3");
  });

  it("adds qr link only to google calendar details", () => {
    const payload = buildCalendarPayload(
      {
        title: "Open Mic Night",
        description: "Community performances",
        confidence: 0.9,
      },
      { qrUrl: "https://example.com/qr-ticket" }
    );

    expect(payload.googleCalendarUrl).toContain(encodeURIComponent("QR link: https://example.com/qr-ticket"));
    expect(payload.outlookCalendarUrl).not.toContain(encodeURIComponent("QR link: https://example.com/qr-ticket"));
  });
});
