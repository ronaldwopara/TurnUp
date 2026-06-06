import { callStructuredLlm } from "../llm/client";
import type { ExtractionResult } from "./eventSchema";
import {
  buildEventFlyerExtractionSchema,
  FLYER_LLM_GOOGLE_CALENDAR_URL_RULES,
  normalizeFlyerExtraction,
  safeParseExtractionResult,
} from "./flyerLlmShared";

function buildSocialCaptionSystemPrompt(referenceYear: number): string {
  return (
    "You extract advertised event details from text that came from a social network post: caption, " +
    "title line, hashtags, and similar. The text may include trailing lines such as 'Source URL:' or " +
    "'Media URL:'; treat those as metadata only—never infer the event schedule from URLs alone. " +
    "CRITICAL: The date when the post was published is UNKNOWN and MUST NOT be used as the event date. " +
    "Never substitute 'today', the current calendar date, or any assumed publish time for the gathering's date. " +
    "Only put a value in `event.date` or `event.time` when the caption (or quoted flyer text inside it) " +
    "clearly states when the advertised event happens. If the post only says 'soon' or 'DM for details' with " +
    "no timing, leave date and time null. " +
    "Produce JSON matching the schema exactly. Never refuse, never add prose outside the JSON object. " +
    `REFERENCE_YEAR=${referenceYear}. When the caption gives a month/day without a year, use year ${referenceYear} in event.date. ` +
    "When a four-digit year appears in the caption, keep that year. " +
    FLYER_LLM_GOOGLE_CALENDAR_URL_RULES
  );
}

function buildSocialCaptionUserContent(postText: string, referenceYear: number): string {
  return [
    `REFERENCE_YEAR=${referenceYear} (use this exact integer whenever a date has no four-digit year).`,
    "",
    "Social post text (caption, title, hashtags; may include 'Source URL' / 'Media URL' footer lines):",
    "---",
    postText.trim() || "(empty)",
    "---",
    "",
    "Return `extractedText` as a clean reading-order transcript of only the event-relevant parts of the caption " +
      "(you may drop pure boilerplate). Fill structured `event` fields from that meaning. " +
      "Use title exactly 'no flyer found' only when the text is clearly not promoting a specific gathering " +
      "(e.g. generic life update, meme, or no event). " +
      "For multi-day phrasing in the caption, set `calendarSchedule` when needed (see system message).",
  ].join("\n");
}

async function callSocialCaptionExtraction(
  referenceYear: number,
  postText: string,
  retryHint?: string
): Promise<ExtractionResult | null> {
  const userParts = [buildSocialCaptionUserContent(postText, referenceYear)];
  if (retryHint?.trim()) {
    userParts.push("", retryHint.trim());
  }

  const raw = await callStructuredLlm<unknown>({
    jsonSchemaName: "EventSocialCaptionExtraction",
    jsonSchema: buildEventFlyerExtractionSchema(referenceYear),
    messages: [
      { role: "system", content: buildSocialCaptionSystemPrompt(referenceYear) },
      { role: "user", content: userParts.join("\n") },
    ],
  });

  if (!raw) {
    return null;
  }

  return safeParseExtractionResult(raw);
}

/**
 * Structured extraction from social post text (caption + scraped lines). Requires `TURNUP_LLM_API_KEY`.
 * Returns null if the key is missing or the model returns invalid JSON after retry.
 */
export async function tryExtractFromSocialPostTextWithLlm(postText: string): Promise<ExtractionResult | null> {
  if (!process.env.TURNUP_LLM_API_KEY?.trim()) {
    return null;
  }

  const referenceYear = new Date().getFullYear();
  const first = await callSocialCaptionExtraction(referenceYear, postText);

  if (!first) {
    const retry = await callSocialCaptionExtraction(
      referenceYear,
      postText,
      "Your previous reply was missing or not valid JSON for the schema. Reply with one JSON object only, no markdown fences."
    );
    if (!retry) {
      return null;
    }
    return normalizeFlyerExtraction(retry);
  }

  const normalized = normalizeFlyerExtraction(first);

  const isNoFlyer = normalized.event.title.toLowerCase() === "no flyer found";
  const firstHadText = postText.trim().length >= 8;
  const lowConfidence = normalized.event.confidence < 0.35;

  if ((isNoFlyer || lowConfidence) && firstHadText) {
    const retry = await callSocialCaptionExtraction(
      referenceYear,
      postText,
      "Previous pass returned 'no flyer found' or low confidence but the caption had substantial text. " +
        "Re-read: if the post promotes any gathering (title, date, time, venue, tickets), extract it. " +
        "Keep 'no flyer found' only when it is genuinely not an event post."
    );
    if (retry) {
      const retryNormalized = normalizeFlyerExtraction(retry);
      if (retryNormalized.event.title.toLowerCase() !== "no flyer found") {
        return retryNormalized;
      }
    }
  }

  return normalized;
}
