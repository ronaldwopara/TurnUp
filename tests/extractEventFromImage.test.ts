import { describe, expect, it, vi } from "vitest";
import { extractEventExtractionResultFromImage } from "../lib/eventExtraction/extractEventFromImage";

vi.mock("../lib/ocr/extractText", () => {
  return {
    extractTextFromImage: vi.fn(async () => "Community Yoga\nJune 18th\n7-10 PM\nDowntown Wellness Centre"),
  };
});

vi.mock("../lib/extraction/llmTextCleanup", () => ({
  extractFromOcrTextWithLlm: vi.fn(async (ocr: string) => ({
    extractedText: ocr,
    event: {
      title: "Community Yoga",
      date: "June 18th",
      time: "7-10 PM",
      location: "Downtown Wellness Centre",
      description: "Evening yoga session.",
      confidence: 0.88,
      calendarSchedule: null,
    },
    ambiguityNotes: [],
  })),
}));

describe("extractEventFromImage", () => {
  it("runs OCR then mandatory LLM text cleanup", async () => {
    const inputBuffer = Buffer.from("fake-image-data");
    const result = await extractEventExtractionResultFromImage(inputBuffer);

    expect(result.extractionResult.extractedText).toContain("Community Yoga");
    expect(result.extractionResult.event.title.toLowerCase()).toContain("community yoga");
    expect(result.extractionResult.event.confidence).toBeCloseTo(0.88);
    expect(result.parsedEvent.confidence).toBeGreaterThan(40);
    expect(result.extractionResult.event.location?.toLowerCase()).toContain("wellness");
  });
});
