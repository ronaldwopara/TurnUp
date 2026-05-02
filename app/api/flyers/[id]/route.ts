import { ok, badRequest } from "@/lib/api/http";
import { getFlyerById } from "@/lib/repos/flyersRepo";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: flyerId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return badRequest("userId is required");
    }

    const flyer = await getFlyerById(flyerId);
    if (!flyer) {
      return badRequest("Flyer not found");
    }

    if (flyer.userId !== userId) {
      return badRequest("Not authorized to delete this flyer");
    }

    await db.postedFlyer.delete({
      where: { id: flyerId },
    });

    return ok({ deleted: true, flyerId });
  } catch (error) {
    console.error("Failed to delete flyer:", error);
    return badRequest("Failed to delete flyer");
  }
}
