import { createHash } from "node:crypto";
import type { ScanSourceType, StashItemType } from "@prisma/client";
import { buildCalendarPayload, type EventPayload } from "@/lib/extraction/eventSchema";
import { extractFromImageWithLlm } from "@/lib/extraction/llmExtract";
import { normalizeTextToEvent } from "@/lib/extraction/llmNormalize";
import { detectQrUrlFromImage } from "@/lib/extraction/qr";
import { getSocialMediaContent } from "@/lib/extraction/social";
import { fetchReadableTextFromUrl } from "@/lib/extraction/webText";
import { saveScanAndStashItem } from "@/lib/repos/stashRepo";

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
}): Promise<IngestFlowResult> {
  const social = await getSocialMediaContent({ url: input.url });
  const mergedText = [social.text, social.mediaUrl ? `Media URL: ${social.mediaUrl}` : ""]
    .filter(Boolean)
    .join("\n");

  const normalized = await normalizeTextToEvent({
    text: mergedText,
    sourceLabel: "social",
  });
  const calendarPayload = buildCalendarPayload(normalized.event);

  await persist({
    userId: input.userId,
    sourceType: "social",
    itemType: social.mediaUrl?.includes(".mp4") ? "video" : "link",
    sourceUrl: input.url,
    rawText: normalized.extractedText,
    event: normalized.event,
    providerRaw: social.providerRaw,
  });

  return {
    extractedText: normalized.extractedText,
    event: normalized.event,
    calendarPayload,
    qr: { url: null, calendarPayloadFromTarget: null },
    ambiguityNotes: normalized.ambiguityNotes,
    sourceUrl: input.url,
    mediaUrl: social.mediaUrl,
  };
}

export async function ingestWebLinkFlow(input: {
  userId: string;
  url: string;
}): Promise<IngestFlowResult> {
  const readableText = await fetchReadableTextFromUrl(input.url);
  const normalized = await normalizeTextToEvent({
    text: [readableText, `Source URL: ${input.url}`].filter(Boolean).join("\n"),
    sourceLabel: "web_link",
  });
  const calendarPayload = buildCalendarPayload(normalized.event);

  await persist({
    userId: input.userId,
    sourceType: "social",
    itemType: "link",
    sourceUrl: input.url,
    rawText: normalized.extractedText,
    event: normalized.event,
    providerRaw: { readableText },
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
}): Promise<IngestFlowResult> {
  if (isSocialMediaUrl(input.url)) {
    return ingestSocialFlow(input);
  }

  if (isEventPageUrl(input.url)) {
    return ingestWebLinkFlow(input);
  }

  return ingestWebLinkFlow(input);
}
