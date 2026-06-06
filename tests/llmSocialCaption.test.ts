import { describe, expect, it, afterEach } from "vitest";
import { tryExtractFromSocialPostTextWithLlm } from "../lib/extraction/llmSocialCaption";

describe("tryExtractFromSocialPostTextWithLlm", () => {
  const originalKey = process.env.TURNUP_LLM_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.TURNUP_LLM_API_KEY;
    } else {
      process.env.TURNUP_LLM_API_KEY = originalKey;
    }
  });

  it("returns null when TURNUP_LLM_API_KEY is missing", async () => {
    delete process.env.TURNUP_LLM_API_KEY;
    await expect(tryExtractFromSocialPostTextWithLlm("Summer block party June 1")).resolves.toBeNull();
  });
});
