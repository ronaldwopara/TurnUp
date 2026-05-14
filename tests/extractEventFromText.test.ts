import { describe, expect, it } from "vitest";
import { parseTextToExtractionResult } from "../lib/eventExtraction/extractEventFromText";

describe("parseTextToExtractionResult", () => {
  it("creates extraction result from plain event text", () => {
    const result = parseTextToExtractionResult(
      "Hack Night\nThu May 14 6:30pm to 8pm\nRoom 201, Engineering Building\nBring your laptop",
    );
    expect(result.extractionResult.event.title.toLowerCase()).toContain("hack night");
    expect(result.extractionResult.event.date).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(result.extractionResult.event.time?.toLowerCase()).toContain("pm");
    expect(result.extractionResult.event.location?.toLowerCase()).toContain("engineering");
  });
});
