import type { LearnedFact } from "@prisma/client";
import { db } from "@/lib/db";

function inferImageUrlFromSource(sourceUrl?: string | null): string | undefined {
  if (!sourceUrl) return undefined;
  try {
    const pathname = new URL(sourceUrl).pathname.toLowerCase();
    if (/\.(png|jpe?g|webp|gif)(\?|$)/i.test(pathname)) {
      return sourceUrl;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function faviconForUrl(sourceUrl?: string | null): string | undefined {
  if (!sourceUrl) return undefined;
  try {
    const url = new URL(sourceUrl);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=256`;
  } catch {
    return undefined;
  }
}

function stashThumbnailFromScan(input: {
  sourceUrl?: string | null;
  itemType: string;
  providerRawJson?: unknown;
}): string | undefined {
  const directImage = inferImageUrlFromSource(input.sourceUrl);
  if (directImage) return directImage;

  if (input.providerRawJson && typeof input.providerRawJson === "object") {
    const mediaUrl =
      "mediaUrl" in input.providerRawJson ? (input.providerRawJson as { mediaUrl?: unknown }).mediaUrl : undefined;
    if (typeof mediaUrl === "string" && mediaUrl.trim().length > 0) {
      return mediaUrl;
    }
  }

  if (input.itemType === "link" || input.itemType === "video") {
    return faviconForUrl(input.sourceUrl);
  }

  return undefined;
}

export async function ensureUser(userId: string) {
  return db.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      displayName: "TurnUp Student",
      schoolLabel: "University of Alberta · 2025–26",
    },
  });
}

export async function replaceLearnedFacts(userId: string, facts: Array<{
  text: string;
  factType: string;
  confidence: number;
}>): Promise<LearnedFact[]> {
  await ensureUser(userId);

  await db.learnedFact.deleteMany({
    where: { userId },
  });

  if (facts.length === 0) {
    return [];
  }

  await db.learnedFact.createMany({
    data: facts.map((fact) => ({
      userId,
      text: fact.text,
      factType: fact.factType,
      confidence: fact.confidence,
    })),
  });

  return db.learnedFact.findMany({
    where: { userId },
    orderBy: { generatedAt: "desc" },
  });
}

export async function getProfileBundle(userId: string) {
  await ensureUser(userId);

  const [user, stashItems, learnedFacts] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
    }),
    db.stashItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        scanItem: {
          select: {
            providerRawJson: true,
          },
        },
      },
    }),
    db.learnedFact.findMany({
      where: { userId },
      orderBy: { generatedAt: "desc" },
      take: 20,
    }),
  ]);

  return {
    profile: {
      id: user.id,
      displayName: user.displayName ?? "TurnUp Student",
      schoolLabel: user.schoolLabel ?? "",
      avatarUrl: user.avatarUrl,
    },
    stashes: stashItems.map((item) => ({
      id: item.id,
      type: item.itemType,
      title: item.title,
      subtitle: item.subtitle,
      detailLabel: item.detailLabel,
      assetRef: item.assetRef,
      sourceUrl: item.sourceUrl,
      thumbnailUrl: stashThumbnailFromScan({
        sourceUrl: item.sourceUrl,
        itemType: item.itemType,
        providerRawJson: item.scanItem?.providerRawJson,
      }),
      createdAt: item.createdAt,
    })),
    learnedFacts: learnedFacts.map((fact) => ({
      id: fact.id,
      text: fact.text,
      type: fact.factType,
      confidence: fact.confidence,
      generatedAt: fact.generatedAt,
    })),
  };
}
