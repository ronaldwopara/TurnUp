import { describe, expect, it } from "vitest";
import { parseEvent } from "../lib/parser/parseEvent";

describe("parseEvent", () => {
  it("extracts title date time and location from common flyer text", () => {
    const parsed = parseEvent(
      "SPRING MIXER\nFriday May 22 at 7:00 PM\nStudent Union Hall\nMusic, snacks, networking",
    );

    expect(parsed.title?.toLowerCase()).toContain("spring mixer");
    expect(parsed.start).toBeInstanceOf(Date);
    expect(parsed.location?.toLowerCase()).toContain("student union hall");
    expect(parsed.description?.toLowerCase()).toContain("music");
    expect(parsed.confidence).toBeGreaterThan(60);
  });

  it("supports explicit time ranges", () => {
    const parsed = parseEvent("Hack Night\nJune 18th 6:30pm to 8pm\nRoom 201, Engineering Building");
    expect(parsed.start).toBeInstanceOf(Date);
    expect(parsed.end).toBeInstanceOf(Date);
    expect(parsed.start && parsed.end ? parsed.end.getTime() : 0).toBeGreaterThan(
      parsed.start ? parsed.start.getTime() : 0,
    );
    expect(parsed.location?.toLowerCase()).toContain("engineering");
    expect(parsed.start?.getMonth()).toBe(5);
    expect(parsed.start?.getDate()).toBe(18);
  });

  it("prefers explicit calendar lines over a bare time range", () => {
    const parsed = parseEvent("RR\n10AM - 3PM\nJAN 6, 7, & 8, 2026");
    expect(parsed.start?.getMonth()).toBe(0);
    expect(parsed.start?.getFullYear()).toBe(2026);
  });

  it("does not treat the date block as the venue when a real place line exists", () => {
    const parsed = parseEvent("RR\n10AM - 3PM\nJAN 6, 7, & 8, 2026\nETLC Solarium");
    expect(parsed.location?.toLowerCase()).toContain("etlc");
    expect(parsed.location?.toLowerCase()).not.toMatch(/jan|2026/);
  });

  it("does not invent a date from chrono noise like split single letters", () => {
    const parsed = parseEvent("~~ ESS\n-_— EY 5096\na\ny\nj——");
    expect(parsed.start).toBeUndefined();
  });

  it("returns warnings for ambiguous low-signal text", () => {
    const parsed = parseEvent("Join us soon\nDetails coming");
    expect(parsed.warnings?.length).toBeGreaterThan(0);
    expect(parsed.confidence).toBeLessThan(70);
  });
});
