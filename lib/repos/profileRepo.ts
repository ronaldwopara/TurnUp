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

export async function ensureUser(userId: string, displayName?: string) {
  return db.user.upsert({
    where: { id: userId },
    update: displayName ? { displayName } : {},
    create: {
      id: userId,
      displayName: displayName ?? "TurnUp Student",
      schoolLabel: "",
    },
  });
}

export async function deleteUser(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return false;
  }
  await db.user.delete({ where: { id: userId } });
  return true;
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

function normalizeFactText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(input: string): Set<string> {
  return new Set(
    normalizeFactText(input)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 3),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function isSignificantlyDifferent(candidate: string, existingTexts: string[]): boolean {
  const normalizedCandidate = normalizeFactText(candidate);
  if (!normalizedCandidate) {
    return false;
  }
  const candidateTokens = tokenSet(normalizedCandidate);
  for (const existing of existingTexts) {
    const normalizedExisting = normalizeFactText(existing);
    if (!normalizedExisting) {
      continue;
    }
    if (normalizedExisting === normalizedCandidate) {
      return false;
    }
    if (
      normalizedExisting.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedExisting)
    ) {
      return false;
    }
    const similarity = jaccardSimilarity(candidateTokens, tokenSet(normalizedExisting));
    if (similarity >= 0.7) {
      return false;
    }
  }
  return true;
}

export async function addLearnedFactIfNovel(input: {
  userId: string;
  text: string;
  factType: string;
  confidence: number;
}) {
  await ensureUser(input.userId);
  const trimmedText = input.text.trim();
  if (!trimmedText) {
    return null;
  }

  const existing = await db.learnedFact.findMany({
    where: { userId: input.userId },
    orderBy: { generatedAt: "desc" },
    take: 30,
    select: { text: true },
  });

  if (!isSignificantlyDifferent(trimmedText, existing.map((item) => item.text))) {
    return null;
  }

  return db.learnedFact.create({
    data: {
      userId: input.userId,
      text: trimmedText,
      factType: input.factType,
      confidence: Math.min(1, Math.max(0, input.confidence)),
    },
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
