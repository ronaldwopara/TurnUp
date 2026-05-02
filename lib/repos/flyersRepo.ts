import { db } from "@/lib/db";
import { ensureUser } from "./profileRepo";

export type CreateFlyerInput = {
  userId: string;
  title: string;
  description?: string;
  eventDate?: string;
  price?: string;
  imageUrl?: string;
  color?: string;
  accent?: string;
  displayName?: string;
};

export async function createFlyer(input: CreateFlyerInput) {
  await ensureUser(input.userId, input.displayName);

  return db.postedFlyer.create({
    data: {
      userId: input.userId,
      title: input.title,
      description: input.description,
      eventDate: input.eventDate,
      price: input.price,
      imageUrl: input.imageUrl,
      color: input.color ?? "#1a1230",
      accent: input.accent ?? "#9b72cf",
      published: true,
    },
  });
}

export async function getPublishedFlyers() {
  const flyers = await db.postedFlyer.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          displayName: true,
        },
      },
      _count: {
        select: {
          events: true,
        },
      },
    },
  });

  const flyersWithCounts = await Promise.all(
    flyers.map(async (flyer) => {
      const [impressions, saves, clicks] = await Promise.all([
        db.flyerEvent.count({
          where: { flyerId: flyer.id, action: "impression" },
        }),
        db.flyerEvent.count({
          where: { flyerId: flyer.id, action: "save" },
        }),
        db.flyerEvent.count({
          where: { flyerId: flyer.id, action: "click" },
        }),
      ]);

      return {
        id: flyer.id,
        title: flyer.title,
        description: flyer.description,
        eventDate: flyer.eventDate,
        price: flyer.price,
        imageUrl: flyer.imageUrl,
        color: flyer.color,
        accent: flyer.accent,
        createdAt: flyer.createdAt,
        postedBy: flyer.user?.displayName ?? "TurnUp Organiser",
        impressions,
        saves,
        clicks,
      };
    }),
  );

  return flyersWithCounts;
}

export async function getUserFlyers(userId: string) {
  const flyers = await db.postedFlyer.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const flyersWithCounts = await Promise.all(
    flyers.map(async (flyer) => {
      const [impressions, saves, clicks] = await Promise.all([
        db.flyerEvent.count({
          where: { flyerId: flyer.id, action: "impression" },
        }),
        db.flyerEvent.count({
          where: { flyerId: flyer.id, action: "save" },
        }),
        db.flyerEvent.count({
          where: { flyerId: flyer.id, action: "click" },
        }),
      ]);

      return {
        id: flyer.id,
        title: flyer.title,
        description: flyer.description,
        eventDate: flyer.eventDate,
        price: flyer.price,
        imageUrl: flyer.imageUrl,
        color: flyer.color,
        accent: flyer.accent,
        published: flyer.published,
        createdAt: flyer.createdAt,
        impressions,
        saves,
        clicks,
      };
    }),
  );

  return flyersWithCounts;
}

export async function getFlyerById(flyerId: string) {
  return db.postedFlyer.findUnique({
    where: { id: flyerId },
    include: {
      user: {
        select: {
          displayName: true,
        },
      },
    },
  });
}

export async function trackFlyerEvent(input: {
  flyerId: string;
  action: "impression" | "save" | "click";
  actorId?: string;
}) {
  return db.flyerEvent.create({
    data: {
      flyerId: input.flyerId,
      action: input.action,
      actorId: input.actorId,
    },
  });
}

export async function getFlyerAnalytics(flyerId: string, hoursBack = 24) {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const events = await db.flyerEvent.findMany({
    where: {
      flyerId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
  });

  const totals = {
    impressions: 0,
    saves: 0,
    clicks: 0,
  };

  const hourlyBuckets: Record<string, { impressions: number; saves: number; clicks: number }> = {};

  for (const event of events) {
    if (event.action === "impression") totals.impressions++;
    else if (event.action === "save") totals.saves++;
    else if (event.action === "click") totals.clicks++;

    const hourKey = new Date(event.createdAt).toISOString().slice(0, 13);
    if (!hourlyBuckets[hourKey]) {
      hourlyBuckets[hourKey] = { impressions: 0, saves: 0, clicks: 0 };
    }
    if (event.action === "impression") hourlyBuckets[hourKey].impressions++;
    else if (event.action === "save") hourlyBuckets[hourKey].saves++;
    else if (event.action === "click") hourlyBuckets[hourKey].clicks++;
  }

  const uniqueActors = new Set(events.filter((e) => e.actorId).map((e) => e.actorId)).size;

  const timeSeries = Object.entries(hourlyBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, counts]) => ({
      time: hour,
      ...counts,
    }));

  return {
    totals,
    timeSeries,
    uniqueActors,
    viewToSaveRate: totals.impressions > 0 ? (totals.saves / totals.impressions) * 100 : 0,
    engagementRate: totals.impressions > 0 ? ((totals.saves + totals.clicks) / totals.impressions) * 100 : 0,
  };
}

export async function getAggregateAnalytics(userId: string, hoursBack = 24) {
  const userFlyers = await db.postedFlyer.findMany({
    where: { userId },
    select: { id: true, title: true },
  });

  if (userFlyers.length === 0) {
    return {
      flyers: [],
      aggregate: {
        totals: { impressions: 0, saves: 0, clicks: 0 },
        uniqueActors: 0,
        viewToSaveRate: 0,
        engagementRate: 0,
      },
    };
  }

  const flyerAnalytics = await Promise.all(
    userFlyers.map(async (flyer) => {
      const analytics = await getFlyerAnalytics(flyer.id, hoursBack);
      return {
        flyerId: flyer.id,
        title: flyer.title,
        ...analytics,
      };
    }),
  );

  const aggregate = {
    totals: {
      impressions: flyerAnalytics.reduce((sum, f) => sum + f.totals.impressions, 0),
      saves: flyerAnalytics.reduce((sum, f) => sum + f.totals.saves, 0),
      clicks: flyerAnalytics.reduce((sum, f) => sum + f.totals.clicks, 0),
    },
    uniqueActors: 0,
    viewToSaveRate: 0,
    engagementRate: 0,
  };

  const allActorIds = new Set<string>();
  flyerAnalytics.forEach((f) => {
    f.timeSeries.forEach(() => {});
  });

  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const allEvents = await db.flyerEvent.findMany({
    where: {
      flyerId: { in: userFlyers.map((f) => f.id) },
      createdAt: { gte: since },
    },
  });

  allEvents.forEach((e) => {
    if (e.actorId) allActorIds.add(e.actorId);
  });

  aggregate.uniqueActors = allActorIds.size;
  aggregate.viewToSaveRate =
    aggregate.totals.impressions > 0 ? (aggregate.totals.saves / aggregate.totals.impressions) * 100 : 0;
  aggregate.engagementRate =
    aggregate.totals.impressions > 0
      ? ((aggregate.totals.saves + aggregate.totals.clicks) / aggregate.totals.impressions) * 100
      : 0;

  return {
    flyers: flyerAnalytics,
    aggregate,
  };
}
