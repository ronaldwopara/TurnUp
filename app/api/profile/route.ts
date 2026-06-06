import { ok, unauthorized } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/requireUser";
import { getProfileBundle, deleteUser } from "@/lib/repos/profileRepo";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return unauthorized();
  }
  const profile = await getProfileBundle(userId);
  return ok(profile);
}

export async function DELETE() {
  const userId = await requireUserId();
  if (!userId) {
    return unauthorized();
  }

  const deleted = await deleteUser(userId);

  return ok({ deleted, userId });
}
