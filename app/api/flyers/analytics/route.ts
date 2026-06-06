import { ok, unauthorized } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/requireUser";
import { getAggregateAnalytics } from "@/lib/repos/flyersRepo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);

  const hoursBack = parseInt(searchParams.get("hours") ?? "24", 10);
  const analytics = await getAggregateAnalytics(userId, hoursBack);

  return ok(analytics);
}
