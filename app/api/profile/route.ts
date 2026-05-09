import { ok, badRequest } from "@/lib/api/http";
import { getProfileBundle, deleteUser } from "@/lib/repos/profileRepo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? "demo-user";
  const profile = await getProfileBundle(userId);
  return ok(profile);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId || userId === "demo-user") {
    return badRequest("Valid userId is required");
  }

  const deleted = await deleteUser(userId);

  return ok({ deleted, userId });
}
