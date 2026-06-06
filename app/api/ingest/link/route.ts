import { badRequest, ok, unauthorized } from "@/lib/api/http";
import { socialLinkBodySchema } from "@/lib/api/schemas";
import { requireUserId } from "@/lib/auth/requireUser";
import { db } from "@/lib/db";
import { buildCalendarPayload, type EventPayload } from "@/lib/extraction/eventSchema";
import { ingestLinkFlow } from "@/lib/services/ingestService";
import { canonicalizeSourceUrl } from "@/lib/url/canonicalizeSourceUrl";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return unauthorized();
  }

  const body = await request.json();
  const parsed = socialLinkBodySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid social link payload.", parsed.error.flatten());
  }

  const url = parsed.data.url;
  const canonicalUrl = canonicalizeSourceUrl(url);

  // If the link is already posted as a community flyer, return that immediately (no LLM).
  const existingFlyer = await db.postedFlyer.findFirst({
    where: { sourceUrl: { in: [url, canonicalUrl] }, published: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      eventDate: true,
      calendarUrl: true,
      sourceUrl: true,
      imageUrl: true,
      color: true,
      accent: true,
    },
  });
  if (existingFlyer) {
    const event: EventPayload = {
      title: existingFlyer.title,
      description: existingFlyer.description ?? undefined,
      date: existingFlyer.eventDate ?? undefined,
      time: undefined,
      location: undefined,
      confidence: 0.9,
      calendarSchedule: undefined,
    };
    return ok({
      extractedText: "",
      event,
      calendarPayload: buildCalendarPayload(event),
      qr: { url: null, calendarPayloadFromTarget: null },
      ambiguityNotes: ["Opened previously posted event (skipped re-extraction)."],
      sourceUrl: existingFlyer.sourceUrl ?? canonicalUrl,
      mediaUrl: existingFlyer.imageUrl ?? undefined,
      flyerId: existingFlyer.id,
      alreadyPosted: true,
    });
  }

  // If this exact URL was already scanned, return the stored parse to avoid re-calling the LLM.
  const existingScan = await db.scanItem.findFirst({
    where: {
      userId,
      OR: [{ sourceUrl: url }, { sourceUrl: canonicalUrl }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      rawText: true,
      parsedEventJson: true,
      providerRawJson: true,
      sourceUrl: true,
    },
  });

  const existingEvent = existingScan?.parsedEventJson as EventPayload | null | undefined;
  if (existingScan && existingEvent?.title) {
    const providerRaw =
      existingScan.providerRawJson && typeof existingScan.providerRawJson === "object"
        ? (existingScan.providerRawJson as { mediaUrl?: unknown })
        : undefined;
    const mediaUrl = typeof providerRaw?.mediaUrl === "string" ? providerRaw.mediaUrl : undefined;

    return ok({
      extractedText: existingScan.rawText ?? "",
      event: existingEvent,
      calendarPayload: buildCalendarPayload(existingEvent),
      qr: { url: null, calendarPayloadFromTarget: null },
      ambiguityNotes: ["Reused previously ingested link (skipped re-extraction)."],
      sourceUrl: existingScan.sourceUrl ?? canonicalUrl,
      mediaUrl,
      flyerId: undefined,
      alreadyPosted: false,
    });
  }

  const response = await ingestLinkFlow({
    userId,
    url: canonicalUrl,
    persistDeck: parsed.data.persistDeck,
  });
  return ok(response);
}
