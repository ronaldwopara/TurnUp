import type { LearnedFact } from "@prisma/client";
import { db } from "@/lib/db";

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
