import { auth } from "@clerk/nextjs/server";

export async function requireUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export async function requireUserIdOrThrow(): Promise<string> {
  const userId = await requireUserId();
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }
  return userId;
}
