import { badRequest, ok } from "@/lib/api/http";
import { eventPayloadSchema, buildCalendarPayload } from "@/lib/extraction/eventSchema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { event?: unknown } | null;
  const parsed = eventPayloadSchema.safeParse(body?.event);
  if (!parsed.success) {
    return badRequest("Invalid event payload.", parsed.error.flatten());
  }

  const calendarPayload = buildCalendarPayload(parsed.data);
  return ok(calendarPayload);
}
