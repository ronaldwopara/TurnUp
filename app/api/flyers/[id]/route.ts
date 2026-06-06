import { ok, badRequest, unauthorized } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/requireUser";
import { getFlyerById } from "@/lib/repos/flyersRepo";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return unauthorized();
    }

    const { id: flyerId } = await params;

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
