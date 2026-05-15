import { callStructuredLlm } from "../llm/client";
import type { ExtractionResult } from "./eventSchema";
import {
  buildEventFlyerExtractionSchema,
  FLYER_LLM_GOOGLE_CALENDAR_URL_RULES,
  normalizeFlyerExtraction,
  safeParseExtractionResult,
} from "./flyerLlmShared";

function requireLlmApiKey(): void {
  if (!process.env.TURNUP_LLM_API_KEY?.trim()) {
    throw new Error(
      "TURNUP_LLM_API_KEY is required for flyer image extraction. OCR output is normalized with a text-only LLM before structured fields are trusted."
    );
  }
}

function buildOcrCleanupSystemPrompt(referenceYear: number): string {
  return (
    "You normalize noisy OCR from event flyers, posters, invitations, and event-style graphics. " +
    "The input text is machine-extracted and may have wrong line order, dropped characters, or stray tokens. " +
    "Produce JSON matching the schema exactly. " +
    "Reconstruct `extractedText` as clean, reading-order plain text you believe the flyer conveys—do not copy OCR verbatim if it is clearly garbled. " +
    "For `event`, only use facts supported by that text (or obvious corrections like glued month/day tokens). " +
    "Do not invent a year: if no four-digit year appears, use REFERENCE_YEAR in event.date. If a year appears in the text, keep it. " +
    "Never refuse, never add prose outside the JSON object. " +
    `REFERENCE_YEAR=${referenceYear}. ` +
    FLYER_LLM_GOOGLE_CALENDAR_URL_RULES
  );
}

function buildOcrCleanupUserContent(ocrText: string, referenceYear: number): string {
  return [
    `REFERENCE_YEAR=${referenceYear} (use this exact integer whenever a date has no four-digit year).`,
    "",
    "Raw OCR (untrusted; may be noisy):",
    "---",
    ocrText.trim() || "(empty)",
    "---",
    "",
    "Return normalized transcript plus structured event fields. " +
      "If the text is clearly not an event flyer, set title to exactly 'no flyer found' and confidence to 0. " +
      "For multi-day events, set `calendarSchedule` when needed so Google Calendar URLs match the flyer (see system message).",
  ].join("\n");
}

async function callOcrTextCleanup(referenceYear: number, ocrText: string, retryHint?: string): Promise<ExtractionResult | null> {
  const userParts = [buildOcrCleanupUserContent(ocrText, referenceYear)];
  if (retryHint?.trim()) {
    userParts.push("", retryHint.trim());
  }

  const raw = await callStructuredLlm<unknown>({
    jsonSchemaName: "EventFlyerOcrCleanup",
    jsonSchema: buildEventFlyerExtractionSchema(referenceYear),
    messages: [
      { role: "system", content: buildOcrCleanupSystemPrompt(referenceYear) },
      { role: "user", content: userParts.join("\n") },
    ],
  });

  if (!raw) {
    return null;
  }

  return safeParseExtractionResult(raw);
}

/**
 * Mandatory text-only structured cleanup after OCR. Requires `TURNUP_LLM_API_KEY`.
 * Throws if the LLM is misconfigured or returns invalid JSON after one retry.
 */
export async function extractFromOcrTextWithLlm(ocrText: string): Promise<ExtractionResult> {
  requireLlmApiKey();

  const referenceYear = new Date().getFullYear();
  const first = await callOcrTextCleanup(referenceYear, ocrText);

  if (!first) {
    const retry = await callOcrTextCleanup(
      referenceYear,
      ocrText,
      "Your previous reply was missing or not valid JSON for the schema. Reply with one JSON object only, no markdown fences."
    );
    if (!retry) {
      throw new Error(
        "Flyer OCR text cleanup failed after retry (invalid or empty LLM response). Check TURNUP_LLM_API_URL, TURNUP_LLM_MODEL, and API availability."
      );
    }
    return normalizeFlyerExtraction(retry);
  }

  const normalized = normalizeFlyerExtraction(first);

  const isNoFlyer = normalized.event.title.toLowerCase() === "no flyer found";
  const firstHadText = ocrText.trim().length >= 8;
  const lowConfidence = normalized.event.confidence < 0.35;

  if ((isNoFlyer || lowConfidence) && firstHadText) {
    const retry = await callOcrTextCleanup(
      referenceYear,
      ocrText,
      "Previous pass returned 'no flyer found' or low confidence but OCR had substantial text. " +
        "Re-read the OCR: if any event-style content exists (title, date, time, location), extract it. " +
        "Keep 'no flyer found' only if it is genuinely not an event flyer."
    );
    if (retry) {
      const retryNormalized = normalizeFlyerExtraction(retry);
      const retryIsNoFlyer = retryNormalized.event.title.toLowerCase() === "no flyer found";
      if (!retryIsNoFlyer) {
        return retryNormalized;
      }
    }
  }

  return normalized;
}
