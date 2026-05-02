import { describe, expect, it } from "vitest";
import { buildCalendarPayload, eventPayloadSchema } from "../lib/extraction/eventSchema";

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
