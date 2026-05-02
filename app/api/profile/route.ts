import { ok } from "@/lib/api/http";
import { getProfileBundle } from "@/lib/repos/profileRepo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? "demo-user";
  const profile = await getProfileBundle(userId);
  return ok(profile);
}
