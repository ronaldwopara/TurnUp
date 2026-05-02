import { createHash } from "node:crypto";
import type { ScanSourceType, StashItemType } from "@prisma/client";
import {
  buildCalendarPayload,
  type EventPayload,
  type ExtractionResult,
} from "@/lib/extraction/eventSchema";
import { callStructuredLlm } from "@/lib/llm/client";
import { extractFromImageWithLlm } from "@/lib/extraction/llmExtract";
import { normalizeTextToEvent } from "@/lib/extraction/llmNormalize";
import { detectQrUrlFromImage } from "@/lib/extraction/qr";
import { getSocialMediaContent } from "@/lib/extraction/social";
import { fetchReadableTextFromUrl } from "@/lib/extraction/webText";
import { saveScanAndStashItem } from "@/lib/repos/stashRepo";
import { addLearnedFactIfNovel } from "@/lib/repos/profileRepo";

type PersistInput = {
  userId: string;
  sourceType: ScanSourceType;
  itemType: StashItemType;
  sourceUrl?: string;
  mimeType?: string;
  imageBuffer?: Buffer;
  rawText?: string;
  event: EventPayload;
  qrUrl?: string | null;
  providerRaw?: unknown;
};

type IngestFlowResult = {
  extractedText: string;
  event: EventPayload;
  calendarPayload: ReturnType<typeof buildCalendarPayload>;
  qr: { url: string | null; calendarPayloadFromTarget: ReturnType<typeof buildCalendarPayload> | null };
  ambiguityNotes: string[];
  sourceUrl?: string;
  mediaUrl?: string;
};

const SOCIAL_HOST_MATCHERS = [
  "instagram.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "facebook.com",
  "fb.watch",
  "youtube.com",
  "youtu.be",
  "snapchat.com",
];
const MAX_SOCIAL_IMAGE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_SOCIAL_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const SOCIAL_TITLE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title"],
  properties: {
    title: {
      type: "string",
      description:
        "Concise calendar title in the format '<Organization> <Specific Event>', without emojis or hype language.",
    },
  },
} as const;
const WEB_TITLE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title"],
  properties: {
    title: {
      type: "string",
      description:
        "Concise calendar title in '<Organization> <Specific Event>' style when possible; otherwise a short specific event name.",
    },
  },
} as const;
const INGEST_OBSERVATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary"],
  properties: {
    summary: {
      type: "string",
      description:
        "A concise observation about the user's interests from this ingest item. Max 30 characters.",
    },
  },
} as const;

function inferMimeTypeFromUrl(input: string): string | undefined {
  try {
    const pathname = new URL(input).pathname.toLowerCase();
    if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
      return "image/jpeg";
    }
    if (pathname.endsWith(".png")) {
      return "image/png";
    }
    if (pathname.endsWith(".webp")) {
      return "image/webp";
    }
    if (pathname.endsWith(".gif")) {
      return "image/gif";
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function isLikelyVideoUrl(input: string): boolean {
  return /\.mp4(\?|$)/i.test(input);
}

function isWeakEventTitle(title?: string): boolean {
  const value = title?.trim().toLowerCase() ?? "";
  if (!value) {
    return true;
  }
  if (value.startsWith("source url:") || value.startsWith("social link submitted:")) {
    return true;
  }
  if (value === "instagram" || value === "social post") {
    return true;
  }
  return false;
}

function normalizeObservationSummary(input: string): string {
  return input.replace(/\s+/g, " ").replace(/^[\s"'`]+|[\s"'`]+$/g, "").trim().slice(0, 30);
}

function heuristicObservationFromEvent(event: EventPayload): string {
  const haystack = [event.title, event.description, event.location].filter(Boolean).join(" ").toLowerCase();
  if (/(music|concert|dj|jazz|rap|band)/.test(haystack)) {
    return "You gravitate to live music";
  }
  if (/(hackathon|startup|tech|ai|coding|developer)/.test(haystack)) {
    return "You seek tech-focused events";
  }
  if (/(food|brunch|dinner|snack|taste|market)/.test(haystack)) {
    return "You like food-centered hangs";
  }
  if (/(network|career|professional|resume)/.test(haystack)) {
    return "You value career-building events";
  }
  if (/(art|gallery|design|film|theatre|theater)/.test(haystack)) {
    return "You enjoy creative scenes";
  }
  return "You keep exploring campus life";
}

async function buildIngestObservation(input: {
  event: EventPayload;
  sourceType: "image" | "link";
  sourceUrl?: string;
}): Promise<string> {
  const llm = await callStructuredLlm<unknown>({
    jsonSchemaName: "IngestObservation",
    jsonSchema: INGEST_OBSERVATION_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Write a single profile observation about the user based on one ingested item. " +
          "Return JSON with only { summary }. The summary must sound like an app observation of the user " +
          "(for example: 'You lean toward night events'). Keep it under 30 characters.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `Source type: ${input.sourceType}`,
              `Source URL: ${input.sourceUrl ?? "n/a"}`,
              `Event title: ${input.event.title}`,
              `Event description: ${input.event.description ?? ""}`,
              `Event date: ${input.event.date ?? ""}`,
              `Event time: ${input.event.time ?? ""}`,
              `Event location: ${input.event.location ?? ""}`,
            ].join("\n"),
          },
        ],
      },
    ],
  });

  const maybeSummary = typeof llm === "object" && llm && "summary" in llm ? (llm as { summary?: unknown }).summary : undefined;
  const llmSummary = typeof maybeSummary === "string" ? normalizeObservationSummary(maybeSummary) : "";
  if (llmSummary.length > 0) {
    return llmSummary;
  }
  return normalizeObservationSummary(heuristicObservationFromEvent(input.event));
}

async function saveIngestObservation(input: {
  userId: string;
  event: EventPayload;
  sourceType: "image" | "link";
  sourceUrl?: string;
}) {
  const title = input.event.title?.trim().toLowerCase() ?? "";
  if (!title || title === "no flyer found") {
    return;
  }
  const summary = await buildIngestObservation({
    event: input.event,
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl,
  });
  if (!summary) {
    return;
  }
  await addLearnedFactIfNovel({
    userId: input.userId,
    text: summary,
    factType: "ingest_observation",
    confidence: 0.72,
  });
}

function toTitleCase(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.toUpperCase() === word && word.length <= 5) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function cleanTitleText(input: string): string {
  return input
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .replace(/\s+[.!?,;:]+$/g, "")
    .trim();
}

function extractOrganizationCandidate(socialText: string): string | undefined {
  const line = socialText.split("\n").find((value) => value.trim().length > 0)?.trim() ?? "";
  const orgFromInstagram = line.match(/^(.{2,90}?)\s+on\s+instagram:/i)?.[1];
  if (orgFromInstagram) {
    return cleanTitleText(orgFromInstagram);
  }

  const handleMatch = socialText.match(/-\s*([a-z0-9_.]{3,50})\s+on\s+[a-z]+\s+\d{1,2},\s+\d{4}/i)?.[1];
  if (handleMatch) {
    const expanded = handleMatch
      .split(/[._]/g)
      .filter(Boolean)
      .map((segment) => toTitleCase(segment))
      .join(" ");
    return cleanTitleText(expanded);
  }

  return undefined;
}

function extractSpecificEventCandidate(input: { title?: string; description?: string; socialText: string }): string | undefined {
  const combined = [input.title, input.description, input.socialText].filter(Boolean).join("\n");
  const phrasePatterns = [
    /our\s+([a-z0-9' -]{6,70}?)(?:\s+and\b|[.!?\n]|$)/i,
    /\b(annual general meeting|general meeting|agm|panel discussion|panel|workshop|info session|information session|networking event|career fair|open house|conference|summit|webinar|town hall|mixer|demo day|pitch night)\b/i,
  ];
  for (const pattern of phrasePatterns) {
    const match = combined.match(pattern)?.[1] ?? combined.match(pattern)?.[0];
    if (match) {
      return cleanTitleText(toTitleCase(match));
    }
  }

  return undefined;
}

function normalizeSocialEventTitle(title?: string): string | undefined {
  if (!title?.trim()) {
    return undefined;
  }

  let normalized = title.trim();
  normalized = normalized.replace(/\s+/g, " ");
  normalized = normalized.replace(/^[^:]{1,120}\s+on\s+instagram:\s*/i, "");
  normalized = normalized.replace(/^["'“”]+|["'“”]+$/g, "");

  const weekOutMatch = normalized.match(/less than a week out from\s+(.+?)(?:[.!?]|$)/i);
  if (weekOutMatch?.[1]) {
    normalized = weekOutMatch[1].trim();
  }

  const overlyVerbose = normalized.length > 120;
  if (overlyVerbose) {
    const firstSentence = normalized.match(/^(.{20,120}?[.!?])(?:\s|$)/)?.[1];
    if (firstSentence) {
      normalized = firstSentence.replace(/[.!?]\s*$/, "").trim();
    }
  }

  return normalized || undefined;
}

function fallbackSocialCalendarTitle(input: { event: EventPayload; socialText: string }): string {
  const organization = extractOrganizationCandidate(input.socialText);
  const specific =
    extractSpecificEventCandidate({
      title: input.event.title,
      description: input.event.description,
      socialText: input.socialText,
    }) ?? normalizeSocialEventTitle(input.event.title) ?? "Event";

  const merged = organization ? `${organization} ${specific}` : specific;
  return cleanTitleText(merged).slice(0, 96);
}

function hostnameLabelFromUrl(input: string): string | undefined {
  try {
    const hostname = new URL(input).hostname.toLowerCase().replace(/^www\./, "");
    const root = hostname.split(".")[0];
    if (!root || root.length < 2) {
      return undefined;
    }
    return toTitleCase(root.replace(/[-_]/g, " "));
  } catch {
    return undefined;
  }
}

function fallbackWebCalendarTitle(input: { event: EventPayload; readableText: string; sourceUrl: string }): string {
  const hostLabel = hostnameLabelFromUrl(input.sourceUrl);
  const eventTitle = normalizeSocialEventTitle(input.event.title) ?? "Event";
  const merged =
    hostLabel && !eventTitle.toLowerCase().includes(hostLabel.toLowerCase()) ? `${hostLabel} ${eventTitle}` : eventTitle;
  return cleanTitleText(merged).slice(0, 96);
}

async function rewriteSocialCalendarTitle(input: {
  event: EventPayload;
  socialText: string;
  sourceUrl: string;
}): Promise<string> {
  const organizationHint = extractOrganizationCandidate(input.socialText);
  const llm = await callStructuredLlm<unknown>({
    jsonSchemaName: "SocialCalendarTitleRewrite",
    jsonSchema: SOCIAL_TITLE_JSON_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "Rewrite event titles for calendar entries. Output JSON with only { title }. " +
          "The title must be concise, specific, and use the format '<Organization> <Specific Event>' when possible. " +
          "Do not copy marketing sentence fragments. Do not include emojis, hashtags, quote marks, or call-to-action text. " +
          "Keep title <= 96 chars.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `Source URL: ${input.sourceUrl}`,
              `Organization hint: ${organizationHint ?? "unknown"}`,
              `Current title: ${input.event.title}`,
              `Description: ${input.event.description ?? ""}`,
              `Date: ${input.event.date ?? ""}`,
              `Time: ${input.event.time ?? ""}`,
              "Source social text:",
              input.socialText.slice(0, 1800),
            ].join("\n"),
          },
        ],
      },
    ],
  });

  const maybeTitle = typeof llm === "object" && llm && "title" in llm ? (llm as { title?: unknown }).title : undefined;
  const cleaned = typeof maybeTitle === "string" ? cleanTitleText(maybeTitle) : "";
  if (cleaned) {
    return cleaned.slice(0, 96);
  }
  return fallbackSocialCalendarTitle({ event: input.event, socialText: input.socialText });
}

async function rewriteWebCalendarTitle(input: {
  event: EventPayload;
  readableText: string;
  sourceUrl: string;
}): Promise<string> {
  const hostLabel = hostnameLabelFromUrl(input.sourceUrl);
  const llm = await callStructuredLlm<unknown>({
    jsonSchemaName: "WebCalendarTitleRewrite",
    jsonSchema: WEB_TITLE_JSON_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "Rewrite event titles for calendar entries. Output JSON with only { title }. " +
          "Prefer '<Organization> <Specific Event>' if organization is identifiable. " +
          "Keep title concise (<= 96 chars), remove marketing fluff, hashtags, and emojis.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `Source URL: ${input.sourceUrl}`,
              `Host hint: ${hostLabel ?? "unknown"}`,
              `Current title: ${input.event.title}`,
              `Description: ${input.event.description ?? ""}`,
              "Readable page text:",
              input.readableText.slice(0, 1800),
            ].join("\n"),
          },
        ],
      },
    ],
  });

  const maybeTitle = typeof llm === "object" && llm && "title" in llm ? (llm as { title?: unknown }).title : undefined;
  const cleaned = typeof maybeTitle === "string" ? cleanTitleText(maybeTitle) : "";
  if (cleaned) {
    return cleaned.slice(0, 96);
  }
  return fallbackWebCalendarTitle(input);
}

function firstMatchingLine(input: string, pattern: RegExp): string | undefined {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    const match = line.match(pattern);
    if (match?.[1]) {
      return cleanTitleText(match[1]);
    }
  }
  return undefined;
}

function enrichMissingFieldsFromSocialText(event: EventPayload, socialText: string): EventPayload {
  const enriched: EventPayload = { ...event };

  if (!enriched.location) {
    const locationFromMarker =
      firstMatchingLine(socialText, /(?:^|[\s])(?:📍|location[:\-]?)\s*([a-z0-9][^\n]{1,100})$/i) ??
      firstMatchingLine(socialText, /(?:venue|location)[:\-]\s*([^\n]{2,100})$/i);
    if (locationFromMarker) {
      enriched.location = locationFromMarker;
    }
  }

  if (!enriched.date) {
    const datePattern =
      /\b((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?)\b/i;
    const dateFromMarker = firstMatchingLine(socialText, /(?:^|[\s])(?:📅|date[:\-]?)\s*([^\n]{3,90})$/i);
    const dateCandidate = dateFromMarker?.match(datePattern)?.[1] ?? socialText.match(datePattern)?.[1];
    if (dateCandidate) {
      enriched.date = cleanTitleText(dateCandidate);
    }
  }

  if (!enriched.time) {
    const timePattern =
      /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:[-–—]|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{1,2}(?::\d{2})\s*(?:am|pm))/i;
    const timeFromMarker = firstMatchingLine(socialText, /(?:^|[\s])(?:⏰|time[:\-]?)\s*([^\n]{2,90})$/i);
    const timeCandidate = timeFromMarker?.match(timePattern)?.[1] ?? socialText.match(timePattern)?.[1];
    if (timeCandidate) {
      enriched.time = cleanTitleText(timeCandidate);
    }
  }

  return enriched;
}

function enrichMissingFieldsFromWebText(event: EventPayload, readableText: string): EventPayload {
  const enriched: EventPayload = { ...event };

  if (!enriched.date) {
    const datePattern =
      /\b((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?)\b/i;
    const dateFromLabel =
      firstMatchingLine(readableText, /(?:date(?:\s+and\s+time)?|when)[:\-]\s*([^\n]{3,120})$/i) ??
      firstMatchingLine(readableText, /(?:date(?:\s+and\s+time)?|when)\s+([^\n]{3,120})$/i);
    const dateCandidate = dateFromLabel?.match(datePattern)?.[1] ?? readableText.match(datePattern)?.[1];
    if (dateCandidate) {
      enriched.date = cleanTitleText(dateCandidate);
    }
  }

  if (!enriched.time) {
    const timePattern =
      /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:[-–—]|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{1,2}(?::\d{2})\s*(?:am|pm))/i;
    const timeFromLabel =
      firstMatchingLine(readableText, /(?:time|starts?\s+at|ends?\s+at)[:\-]\s*([^\n]{2,100})$/i) ??
      firstMatchingLine(readableText, /(?:time|starts?\s+at|ends?\s+at)\s+([^\n]{2,100})$/i);
    const timeCandidate = timeFromLabel?.match(timePattern)?.[1] ?? readableText.match(timePattern)?.[1];
    if (timeCandidate) {
      enriched.time = cleanTitleText(timeCandidate);
    }
  }

  if (!enriched.location) {
    const locationFromLabel =
      firstMatchingLine(readableText, /(?:location|where|venue)[:\-]\s*([^\n]{3,160})$/i) ??
      firstMatchingLine(readableText, /(?:location|where|venue)\s+([^\n]{3,160})$/i);
    if (locationFromLabel) {
      enriched.location = cleanTitleText(locationFromLabel);
    }
  }

  return enriched;
}

function mergeSocialExtractions(vision: ExtractionResult, textModel: ExtractionResult): ExtractionResult {
  const merged: ExtractionResult = {
    extractedText: [vision.extractedText, textModel.extractedText].filter(Boolean).join("\n\n"),
    event: {
      ...vision.event,
    },
    ambiguityNotes: Array.from(new Set([...vision.ambiguityNotes, ...textModel.ambiguityNotes])),
  };

  const visionTitle = vision.event.title?.trim() ?? "";
  const textTitle = textModel.event.title?.trim() ?? "";
  const textLooksRicher = textTitle.split(/\s+/).filter(Boolean).length >= 3 && textTitle.length > visionTitle.length + 4;
  const visionLooksWeak = isWeakEventTitle(visionTitle) || visionTitle.split(/\s+/).filter(Boolean).length <= 1;
  if (textTitle && (visionLooksWeak || textLooksRicher)) {
    merged.event.title = textTitle;
  }

  const normalizedTitle = normalizeSocialEventTitle(merged.event.title);
  if (normalizedTitle) {
    merged.event.title = normalizedTitle;
  }

  if (!merged.event.date && textModel.event.date) {
    merged.event.date = textModel.event.date;
  }
  if (!merged.event.time && textModel.event.time) {
    merged.event.time = textModel.event.time;
  }
  if (!merged.event.location && textModel.event.location) {
    merged.event.location = textModel.event.location;
  }
  if (!merged.event.description && textModel.event.description) {
    merged.event.description = textModel.event.description;
  }
  merged.event.confidence = Math.max(vision.event.confidence ?? 0.3, textModel.event.confidence ?? 0.3);
  if (!merged.event.calendarSchedule && textModel.event.calendarSchedule) {
    merged.event.calendarSchedule = textModel.event.calendarSchedule;
  }

  return merged;
}

async function downloadSocialImage(input: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const response = await fetch(input, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    if (!response.ok) {
      return null;
    }

    const contentLengthHeader = response.headers.get("content-length");
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;
    if (Number.isFinite(contentLength) && contentLength && contentLength > MAX_SOCIAL_IMAGE_BYTES) {
      return null;
    }

    const rawContentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    const mimeType = rawContentType ?? inferMimeTypeFromUrl(input);
    if (!mimeType || !SUPPORTED_SOCIAL_IMAGE_TYPES.has(mimeType)) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_SOCIAL_IMAGE_BYTES) {
      return null;
    }

    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
    };
  } catch {
    return null;
  }
}

function stableAssetRef(buffer?: Buffer, mimeType?: string): string | undefined {
  if (!buffer) {
    return undefined;
  }
  const digest = createHash("sha256").update(buffer).digest("hex");
  return `ingest://${mimeType ?? "application/octet-stream"}/${digest}`;
}

async function persist(input: PersistInput) {
  const assetRef = stableAssetRef(input.imageBuffer, input.mimeType);
  await saveScanAndStashItem({
    userId: input.userId,
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl,
    itemType: input.itemType,
    mimeType: input.mimeType,
    assetRef,
    rawText: input.rawText,
    parsedEvent: input.event,
    qrUrl: input.qrUrl ?? undefined,
    providerRaw: input.providerRaw,
  });
}

export async function ingestImageFlow(input: {
  userId: string;
  imageBuffer: Buffer;
  mimeType: string;
  persistDeck?: boolean;
}) {
  const imageBase64 = input.imageBuffer.toString("base64");
  const qrUrl = detectQrUrlFromImage(input.imageBuffer, input.mimeType);
  const contextHint = qrUrl ? `QR detected: ${qrUrl}` : undefined;

  const extracted = await extractFromImageWithLlm({
    imageBase64,
    mimeType: input.mimeType,
    contextHint,
  });

  const event = extracted.event;
  const calendarPayload = buildCalendarPayload(event, { qrUrl });
  if (process.env.TURNUP_DEBUG_EXTRACTION === "true") {
    console.info("turnup:image-extraction-debug", {
      event,
      ambiguityNotes: extracted.ambiguityNotes,
      calendarPayload,
    });
  }

  if (input.persistDeck !== false) {
    await persist({
      userId: input.userId,
      sourceType: qrUrl ? "qr" : "image",
      itemType: "image",
      mimeType: input.mimeType,
      imageBuffer: input.imageBuffer,
      rawText: extracted.extractedText,
      event,
      qrUrl,
      providerRaw: {
        extracted,
      },
    });
  }
  await saveIngestObservation({
    userId: input.userId,
    event,
    sourceType: "image",
  });

  return {
    extractedText: extracted.extractedText,
    event,
    calendarPayload,
    qr: {
      url: qrUrl,
      calendarPayloadFromTarget: null,
    },
    ambiguityNotes: extracted.ambiguityNotes,
  };
}

export async function ingestSocialFlow(input: {
  userId: string;
  url: string;
  persistDeck?: boolean;
}): Promise<IngestFlowResult> {
  const social = await getSocialMediaContent({ url: input.url });
  const mediaImage = social.mediaUrl ? await downloadSocialImage(social.mediaUrl) : null;
  const mergedText = [social.text, social.mediaUrl ? `Media URL: ${social.mediaUrl}` : ""]
    .filter(Boolean)
    .join("\n");

  let extraction: ExtractionResult;
  if (mediaImage) {
    const visionExtraction = await extractFromImageWithLlm({
      imageBase64: mediaImage.buffer.toString("base64"),
      mimeType: mediaImage.mimeType,
      contextHint: [social.text, `Social source URL: ${input.url}`].filter(Boolean).join("\n"),
    });
    const textExtraction = await normalizeTextToEvent({
      text: mergedText,
      sourceLabel: "social",
    });
    extraction = mergeSocialExtractions(visionExtraction, textExtraction);
  } else {
    extraction = await normalizeTextToEvent({
      text: mergedText,
      sourceLabel: "social",
    });
  }

  extraction.event.title = await rewriteSocialCalendarTitle({
    event: extraction.event,
    socialText: mergedText,
    sourceUrl: input.url,
  });
  extraction.event = enrichMissingFieldsFromSocialText(extraction.event, mergedText);

  const itemType: StashItemType = mediaImage
    ? "image"
    : social.mediaUrl && isLikelyVideoUrl(social.mediaUrl)
      ? "video"
      : "link";
  const calendarPayload = buildCalendarPayload(extraction.event);

  if (input.persistDeck !== false) {
    await persist({
      userId: input.userId,
      sourceType: "social",
      itemType,
      sourceUrl: input.url,
      mimeType: mediaImage?.mimeType,
      imageBuffer: mediaImage?.buffer,
      rawText: extraction.extractedText,
      event: extraction.event,
      providerRaw: {
        socialProvider: social.providerRaw,
        mediaUrl: social.mediaUrl,
        usedVisionExtraction: Boolean(mediaImage),
      },
    });
  }
  await saveIngestObservation({
    userId: input.userId,
    event: extraction.event,
    sourceType: "link",
    sourceUrl: input.url,
  });

  return {
    extractedText: extraction.extractedText,
    event: extraction.event,
    calendarPayload,
    qr: { url: null, calendarPayloadFromTarget: null },
    ambiguityNotes: extraction.ambiguityNotes,
    sourceUrl: input.url,
    mediaUrl: social.mediaUrl,
  };
}

export async function ingestWebLinkFlow(input: {
  userId: string;
  url: string;
  persistDeck?: boolean;
}): Promise<IngestFlowResult> {
  const readableText = await fetchReadableTextFromUrl(input.url);
  const normalized = await normalizeTextToEvent({
    text: [readableText, `Source URL: ${input.url}`].filter(Boolean).join("\n"),
    sourceLabel: "web_link",
  });
  normalized.event.title = await rewriteWebCalendarTitle({
    event: normalized.event,
    readableText,
    sourceUrl: input.url,
  });
  normalized.event = enrichMissingFieldsFromWebText(normalized.event, readableText);
  const calendarPayload = buildCalendarPayload(normalized.event);

  if (input.persistDeck !== false) {
    await persist({
      userId: input.userId,
      sourceType: "social",
      itemType: "link",
      sourceUrl: input.url,
      rawText: normalized.extractedText,
      event: normalized.event,
      providerRaw: { readableText },
    });
  }
  await saveIngestObservation({
    userId: input.userId,
    event: normalized.event,
    sourceType: "link",
    sourceUrl: input.url,
  });

  return {
    extractedText: normalized.extractedText,
    event: normalized.event,
    calendarPayload,
    qr: { url: null, calendarPayloadFromTarget: null },
    ambiguityNotes: normalized.ambiguityNotes,
    sourceUrl: input.url,
  };
}

function isSocialMediaUrl(input: string): boolean {
  try {
    const hostname = new URL(input).hostname.toLowerCase();
    return SOCIAL_HOST_MATCHERS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function isEventPageUrl(input: string): boolean {
  try {
    const hostname = new URL(input).hostname.toLowerCase();
    return hostname === "eventbrite.com" || hostname.endsWith(".eventbrite.com");
  } catch {
    return false;
  }
}

export async function ingestLinkFlow(input: {
  userId: string;
  url: string;
  persistDeck?: boolean;
}): Promise<IngestFlowResult> {
  if (isSocialMediaUrl(input.url)) {
    return ingestSocialFlow(input);
  }

  if (isEventPageUrl(input.url)) {
    return ingestWebLinkFlow(input);
  }

  return ingestWebLinkFlow(input);
}
