import { NextResponse } from "next/server";
import { ok, badRequest, unauthorized } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/requireUser";
import { getFlyerById, getFlyerAnalytics } from "@/lib/repos/flyersRepo";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return unauthorized();
  }

  const { id: flyerId } = await params;
  const { searchParams } = new URL(request.url);

  const flyer = await getFlyerById(flyerId);
  if (!flyer) {
    return badRequest("Flyer not found");
  }

  if (flyer.userId !== userId) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "You can only view analytics for your own flyers" } },
      { status: 403 },
    );
  }

  const hoursBack = parseInt(searchParams.get("hours") ?? "24", 10);
  const analytics = await getFlyerAnalytics(flyerId, hoursBack);

  return ok({
    flyerId,
    title: flyer.title,
    ...analytics,
  });
}
