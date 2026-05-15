import { createHash } from "node:crypto";
import type { ScanSourceType, StashItemType } from "@prisma/client";
import {
  buildCalendarPayload,
  type EventPayload,
  type ExtractionResult,
} from "@/lib/extraction/eventSchema";
import { NO_FLYER_TITLE } from "@/lib/extraction/flyerLlmShared";
import { tryExtractFromSocialPostTextWithLlm } from "@/lib/extraction/llmSocialCaption";
import { detectQrUrlFromImage } from "@/lib/extraction/qr";
import { getSocialMediaContent } from "@/lib/extraction/social";
import { fetchReadableTextFromUrl } from "@/lib/extraction/webText";
import { saveScanAndStashItem } from "@/lib/repos/stashRepo";
import { addLearnedFactIfNovel } from "@/lib/repos/profileRepo";
import { extractEventExtractionResultFromImage } from "@/lib/eventExtraction/extractEventFromImage";
import { parseTextToExtractionResult } from "@/lib/eventExtraction/extractEventFromText";

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
  deterministic?: {
    confidence: number;
    warnings: string[];
    debug?: {
      titleCandidates?: string[];
      detectedDates?: string[];
      detectedLocations?: string[];
      confidenceBreakdown?: Record<string, number>;
    };
  };
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

function inferMimeTypeFromUrl(input: string): string | undefined {
  try {
    const pathname = new URL(input).pathname.toLowerCase();
    if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
    if (pathname.endsWith(".png")) return "image/png";
    if (pathname.endsWith(".webp")) return "image/webp";
    if (pathname.endsWith(".gif")) return "image/gif";
    return undefined;
  } catch {
    return undefined;
  }
}

function isLikelyVideoUrl(input: string): boolean {
  return /\.mp4(\?|$)/i.test(input);
}

function logPersistenceSkipped(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[turnup] Persistence skipped - ${context}: ${message}`);
}

async function persistBestEffort(context: string, input: PersistInput): Promise<void> {
  try {
    await persist(input);
  } catch (error) {
    logPersistenceSkipped(context, error);
  }
}

function heuristicObservationFromEvent(event: EventPayload): string {
  const haystack = [event.title, event.description, event.location].filter(Boolean).join(" ").toLowerCase();
  if (/(music|concert|dj|jazz|rap|band)/.test(haystack)) return "You gravitate to live music";
  if (/(hackathon|startup|tech|ai|coding|developer)/.test(haystack)) return "You seek tech-focused events";
  if (/(food|brunch|dinner|snack|taste|market)/.test(haystack)) return "You like food-centered hangs";
  if (/(network|career|professional|resume)/.test(haystack)) return "You value career-building events";
  if (/(art|gallery|design|film|theatre|theater)/.test(haystack)) return "You enjoy creative scenes";
  return "You keep exploring campus life";
}

async function saveIngestObservation(input: {
  userId: string;
  event: EventPayload;
  sourceType: "image" | "link";
  sourceUrl?: string;
}) {
  const title = input.event.title?.trim().toLowerCase() ?? "";
  if (!title || title === "no flyer found") return;
  const summary = heuristicObservationFromEvent(input.event);
  try {
    await addLearnedFactIfNovel({
      userId: input.userId,
      text: summary,
      factType: "ingest_observation",
      confidence: 0.72,
    });
  } catch (error) {
    logPersistenceSkipped("ingest observation (profile)", error);
  }
}

function toTitleCase(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function cleanTitleText(input: string): string {
  return input
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .replace(/\s+[.!?,;:]+$/g, "")
    .trim();
}

function hostnameLabelFromUrl(input: string): string | undefined {
  try {
    const hostname = new URL(input).hostname.toLowerCase().replace(/^www\./, "");
    const root = hostname.split(".")[0];
    if (!root || root.length < 2) return undefined;
    return toTitleCase(root.replace(/[-_]/g, " "));
  } catch {
    return undefined;
  }
}

function fallbackCalendarTitle(input: { event: EventPayload; sourceUrl: string }): string {
  const hostLabel = hostnameLabelFromUrl(input.sourceUrl);
  const title = cleanTitleText(input.event.title || "");
  if (hostLabel && title && !title.toLowerCase().includes(hostLabel.toLowerCase())) {
    return `${hostLabel} ${title}`.slice(0, 96);
  }
  return title || `${hostLabel ?? "Event"} Event`;
}

function mergeSocialCaptionPrimaryExtraction(caption: ExtractionResult, vision: ExtractionResult): ExtractionResult {
  const c = caption.event;
  const v = vision.event;

  const titleIsMissing = (t: string | undefined) =>
    !t?.trim() || t === "Untitled Event" || t.trim().toLowerCase() === NO_FLYER_TITLE;

  const pickText = (primary: string | undefined, fallback: string | undefined): string | undefined => {
    if (primary?.trim()) return primary;
    if (fallback?.trim()) return fallback;
    return undefined;
  };

  const mergedTitle = titleIsMissing(c.title) ? pickText(v.title, c.title) : c.title;
  const title = (mergedTitle?.trim() || pickText(v.title, c.title) || "Untitled Event").trim();

  return {
    extractedText: [caption.extractedText, "— Image / OCR supplement —", vision.extractedText].filter(Boolean).join("\n\n"),
    event: {
      ...caption.event,
      title,
      date: pickText(c.date, v.date),
      time: pickText(c.time, v.time),
      location: pickText(c.location, v.location),
      description: pickText(c.description, v.description),
      calendarSchedule: c.calendarSchedule ?? v.calendarSchedule,
      confidence: Math.max(c.confidence ?? 0, v.confidence ?? 0),
    },
    ambiguityNotes: Array.from(new Set([...caption.ambiguityNotes, ...vision.ambiguityNotes])),
  };
}

/** When false, trust the caption path alone and skip downloading the post image for OCR. */
function socialPostExtractionNeedsVisionFallback(extraction: ExtractionResult): boolean {
  const ev = extraction.event;
  const title = ev.title?.trim().toLowerCase() ?? "";
  if (title === NO_FLYER_TITLE) return true;
  if ((ev.confidence ?? 0) < 0.38) return true;
  const hasWhen = Boolean(ev.date?.trim() || ev.time?.trim());
  if (!hasWhen) return true;
  return false;
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
    if (!response.ok) return null;

    const contentLengthHeader = response.headers.get("content-length");
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;
    if (Number.isFinite(contentLength) && contentLength && contentLength > MAX_SOCIAL_IMAGE_BYTES) return null;

    const rawContentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    const mimeType = rawContentType ?? inferMimeTypeFromUrl(input);
    if (!mimeType || !SUPPORTED_SOCIAL_IMAGE_TYPES.has(mimeType)) return null;

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_SOCIAL_IMAGE_BYTES) return null;

    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
    };
  } catch {
    return null;
  }
}

function stableAssetRef(buffer?: Buffer, mimeType?: string): string | undefined {
  if (!buffer) return undefined;
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
  const qrUrl = detectQrUrlFromImage(input.imageBuffer, input.mimeType);
  const extracted = await extractEventExtractionResultFromImage(input.imageBuffer);
  const event = extracted.extractionResult.event;
  const calendarPayload = buildCalendarPayload(event, { qrUrl });

  if (input.persistDeck !== false) {
    await persistBestEffort("stash scan (image)", {
      userId: input.userId,
      sourceType: qrUrl ? "qr" : "image",
      itemType: "image",
      mimeType: input.mimeType,
      imageBuffer: input.imageBuffer,
      rawText: extracted.extractionResult.extractedText,
      event,
      qrUrl,
      providerRaw: {
        extracted: extracted.extractionResult,
        parser: extracted.parsedEvent,
      },
    });
  }
  await saveIngestObservation({
    userId: input.userId,
    event,
    sourceType: "image",
  });

  return {
    extractedText: extracted.extractionResult.extractedText,
    event,
    calendarPayload,
    qr: {
      url: qrUrl,
      calendarPayloadFromTarget: null,
    },
    ambiguityNotes: extracted.extractionResult.ambiguityNotes,
    deterministic: {
      confidence: extracted.parsedEvent.confidence,
      warnings: extracted.parsedEvent.warnings ?? [],
      debug: extracted.parsedEvent.debug,
    },
  };
}

export async function ingestSocialFlow(input: {
  userId: string;
  url: string;
  persistDeck?: boolean;
}): Promise<IngestFlowResult> {
  const social = await getSocialMediaContent({ url: input.url });
  const mergedText = [social.text, social.mediaUrl ? `Media URL: ${social.mediaUrl}` : ""].filter(Boolean).join("\n");

  const llmCaption = await tryExtractFromSocialPostTextWithLlm(mergedText);
  const textExtraction = parseTextToExtractionResult(mergedText);

  const captionBaseline = llmCaption ?? textExtraction.extractionResult;
  const usedCaptionLlm = Boolean(llmCaption);

  let extractionResult: ExtractionResult = captionBaseline;
  let parserResult = parseTextToExtractionResult(extractionResult.extractedText || mergedText).parsedEvent;

  let mediaImage: { buffer: Buffer; mimeType: string } | null = null;
  let usedVisionExtraction = false;

  const mediaUrl = social.mediaUrl;
  const canTryImage = Boolean(mediaUrl && !isLikelyVideoUrl(mediaUrl));

  if (canTryImage && socialPostExtractionNeedsVisionFallback(extractionResult)) {
    mediaImage = await downloadSocialImage(mediaUrl!);
    if (mediaImage) {
      const imageExtraction = await extractEventExtractionResultFromImage(mediaImage.buffer);
      extractionResult = mergeSocialCaptionPrimaryExtraction(captionBaseline, imageExtraction.extractionResult);
      usedVisionExtraction = true;
      parserResult = {
        ...imageExtraction.parsedEvent,
        confidence: Math.max(parserResult.confidence, imageExtraction.parsedEvent.confidence),
        warnings: Array.from(
          new Set([...(parserResult.warnings ?? []), ...(imageExtraction.parsedEvent.warnings ?? [])]),
        ),
        debug: imageExtraction.parsedEvent.debug ?? parserResult.debug,
      };
    }
  }

  extractionResult.event.title = fallbackCalendarTitle({ event: extractionResult.event, sourceUrl: input.url });
  const itemType: StashItemType = mediaImage
    ? "image"
    : social.mediaUrl && isLikelyVideoUrl(social.mediaUrl)
      ? "video"
      : "link";
  const calendarPayload = buildCalendarPayload(extractionResult.event);

  if (input.persistDeck !== false) {
    await persistBestEffort("stash scan (social)", {
      userId: input.userId,
      sourceType: "social",
      itemType,
      sourceUrl: input.url,
      mimeType: mediaImage?.mimeType,
      imageBuffer: mediaImage?.buffer,
      rawText: extractionResult.extractedText,
      event: extractionResult.event,
      providerRaw: {
        socialProvider: social.providerRaw,
        mediaUrl: social.mediaUrl,
        usedCaptionLlm,
        usedVisionExtraction,
        parser: parserResult,
      },
    });
  }

  await saveIngestObservation({
    userId: input.userId,
    event: extractionResult.event,
    sourceType: "link",
    sourceUrl: input.url,
  });

  return {
    extractedText: extractionResult.extractedText,
    event: extractionResult.event,
    calendarPayload,
    qr: { url: null, calendarPayloadFromTarget: null },
    ambiguityNotes: extractionResult.ambiguityNotes,
    sourceUrl: input.url,
    mediaUrl: social.mediaUrl,
    deterministic: {
      confidence: parserResult.confidence,
      warnings: parserResult.warnings ?? [],
      debug: parserResult.debug,
    },
  };
}

export async function ingestWebLinkFlow(input: {
  userId: string;
  url: string;
  persistDeck?: boolean;
}): Promise<IngestFlowResult> {
  const readableText = await fetchReadableTextFromUrl(input.url);
  const parsed = parseTextToExtractionResult([readableText, `Source URL: ${input.url}`].filter(Boolean).join("\n"));
  parsed.extractionResult.event.title = fallbackCalendarTitle({ event: parsed.extractionResult.event, sourceUrl: input.url });
  const calendarPayload = buildCalendarPayload(parsed.extractionResult.event);

  if (input.persistDeck !== false) {
    await persistBestEffort("stash scan (web link)", {
      userId: input.userId,
      sourceType: "social",
      itemType: "link",
      sourceUrl: input.url,
      rawText: parsed.extractionResult.extractedText,
      event: parsed.extractionResult.event,
      providerRaw: { readableText, parser: parsed.parsedEvent },
    });
  }

  await saveIngestObservation({
    userId: input.userId,
    event: parsed.extractionResult.event,
    sourceType: "link",
    sourceUrl: input.url,
  });

  return {
    extractedText: parsed.extractionResult.extractedText,
    event: parsed.extractionResult.event,
    calendarPayload,
    qr: { url: null, calendarPayloadFromTarget: null },
    ambiguityNotes: parsed.extractionResult.ambiguityNotes,
    sourceUrl: input.url,
    deterministic: {
      confidence: parsed.parsedEvent.confidence,
      warnings: parsed.parsedEvent.warnings ?? [],
      debug: parsed.parsedEvent.debug,
    },
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
  if (isSocialMediaUrl(input.url)) return ingestSocialFlow(input);
  if (isEventPageUrl(input.url)) return ingestWebLinkFlow(input);
  return ingestWebLinkFlow(input);
}
