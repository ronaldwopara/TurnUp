import type { ScanSourceType, StashItemType } from "@prisma/client";
import type { EventPayload } from "@/lib/extraction/eventSchema";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/repos/profileRepo";

type SaveScanInput = {
  userId: string;
  sourceType: ScanSourceType;
  sourceUrl?: string;
  assetRef?: string;
  mimeType?: string;
  rawText?: string;
  parsedEvent?: EventPayload;
  qrUrl?: string;
  providerRaw?: unknown;
  itemType: StashItemType;
};

function toSubtitle(event?: EventPayload): string | undefined {
  const parts = [event?.date, event?.time].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export async function saveScanAndStashItem(input: SaveScanInput) {
  await ensureUser(input.userId);

  const scan = await db.scanItem.create({
    data: {
      userId: input.userId,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl,
      assetRef: input.assetRef,
      mimeType: input.mimeType,
      rawText: input.rawText,
      parsedEventJson: input.parsedEvent ? JSON.parse(JSON.stringify(input.parsedEvent)) : undefined,
      qrUrl: input.qrUrl,
      providerRawJson: input.providerRaw ? JSON.parse(JSON.stringify(input.providerRaw)) : undefined,
    },
  });

  const stash = await db.stashItem.create({
    data: {
      userId: input.userId,
      scanItemId: scan.id,
      itemType: input.itemType,
      title: input.parsedEvent?.title ?? "Untitled Event",
      subtitle: toSubtitle(input.parsedEvent),
      detailLabel: input.parsedEvent?.location,
      assetRef: input.assetRef,
      sourceUrl: input.sourceUrl ?? input.qrUrl,
    },
  });

  return { scan, stash };
}

export async function createStashItemOnly(input: {
  userId: string;
  itemType: StashItemType;
  title: string;
  subtitle?: string;
  detailLabel?: string;
  assetRef?: string;
  sourceUrl?: string;
}) {
  await ensureUser(input.userId);
  return db.stashItem.create({
    data: {
      userId: input.userId,
      itemType: input.itemType,
      title: input.title,
      subtitle: input.subtitle,
      detailLabel: input.detailLabel,
      assetRef: input.assetRef,
      sourceUrl: input.sourceUrl,
    },
  });
}

export async function getRecentEventTexts(userId: string): Promise<string[]> {
  const scans = await db.scanItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { parsedEventJson: true, rawText: true },
  });

  return scans
    .map((scan) => {
      const parsed = scan.parsedEventJson as EventPayload | null;
      if (parsed?.title) {
        return `${parsed.title} | ${parsed.date ?? ""} | ${parsed.time ?? ""} | ${parsed.location ?? ""}`.trim();
      }
      return scan.rawText ?? "";
    })
    .filter((text) => text.length > 0);
}
