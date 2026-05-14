import { describe, expect, it, vi } from "vitest";
import { extractEventExtractionResultFromImage } from "../lib/eventExtraction/extractEventFromImage";

vi.mock("../lib/ocr/extractText", () => {
  return {
    extractTextFromImage: vi.fn(async () => "Community Yoga\nJune 18th\n7-10 PM\nDowntown Wellness Centre"),
  };
});

describe("extractEventFromImage", () => {
  it("runs OCR text through deterministic parser", async () => {
    const inputBuffer = Buffer.from("fake-image-data");
    const result = await extractEventExtractionResultFromImage(inputBuffer);

    expect(result.extractionResult.extractedText).toContain("Community Yoga");
    expect(result.extractionResult.event.title.toLowerCase()).toContain("community yoga");
    expect(result.parsedEvent.confidence).toBeGreaterThan(40);
    expect(result.extractionResult.event.location?.toLowerCase()).toContain("wellness");
  });
});
