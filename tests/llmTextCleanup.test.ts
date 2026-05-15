import { describe, expect, it, afterEach } from "vitest";
import { extractFromOcrTextWithLlm } from "../lib/extraction/llmTextCleanup";

describe("extractFromOcrTextWithLlm", () => {
  const originalKey = process.env.TURNUP_LLM_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.TURNUP_LLM_API_KEY;
    } else {
      process.env.TURNUP_LLM_API_KEY = originalKey;
    }
  });

  it("throws when TURNUP_LLM_API_KEY is missing", async () => {
    delete process.env.TURNUP_LLM_API_KEY;
    await expect(extractFromOcrTextWithLlm("Some OCR")).rejects.toThrow(/TURNUP_LLM_API_KEY/);
  });
});
