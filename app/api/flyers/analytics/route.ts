import { ok, badRequest } from "@/lib/api/http";
import { getAggregateAnalytics } from "@/lib/repos/flyersRepo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return badRequest("userId is required");
  }

  const hoursBack = parseInt(searchParams.get("hours") ?? "24", 10);
  const analytics = await getAggregateAnalytics(userId, hoursBack);

  return ok(analytics);
}
