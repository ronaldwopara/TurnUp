import { ok, badRequest } from "@/lib/api/http";
import { trackFlyerEvent, getFlyerById } from "@/lib/repos/flyersRepo";
import { z } from "zod";

export const runtime = "nodejs";

const trackEventSchema = z.object({
  action: z.enum(["impression", "save", "click"]),
  actorId: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: flyerId } = await params;

    const flyer = await getFlyerById(flyerId);
    if (!flyer) {
      return ok({ tracked: false });
    }

    const body = await request.json().catch(() => null);
    const parsed = trackEventSchema.safeParse(body);

    if (!parsed.success) {
      return ok({ tracked: false });
    }

    const event = await trackFlyerEvent({
      flyerId,
      action: parsed.data.action,
      actorId: parsed.data.actorId,
    });

    return ok({ id: event.id, tracked: true });
  } catch (error) {
    console.error("Failed to track flyer event:", error);
    return ok({ tracked: false });
  }
}
