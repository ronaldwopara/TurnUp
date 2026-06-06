import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";

import { badRequest, ok, unauthorized } from "@/lib/api/http";
import { parseTurnUpPublicMetadata, type TurnUpPublicMetadata } from "@/lib/auth/clerkMetadata";
import { requireUserId } from "@/lib/auth/requireUser";
import { upsertOnboardingProfile } from "@/lib/repos/profileRepo";

export const runtime = "nodejs";

const onboardingSchema = z.object({
  university: z.string().min(1).optional(),
  universityId: z.string().min(1).optional(),
  universityAbbr: z.string().min(1).optional(),
  role: z.enum(["student", "organiser"]).optional(),
  interestTagIds: z.array(z.string()).optional(),
  dataPrivacyAccepted: z.boolean().optional(),
  onboardingComplete: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid onboarding payload", parsed.error.flatten());
  }

  const clerkUser = await currentUser();
  const displayName =
    clerkUser?.fullName?.trim() ||
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim() ||
    undefined;
  const email = clerkUser?.primaryEmailAddress?.emailAddress;

  const existingMeta = parseTurnUpPublicMetadata(
    clerkUser?.publicMetadata as Record<string, unknown> | undefined,
  );

  const nextMeta: TurnUpPublicMetadata = {
    ...existingMeta,
    ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
    ...(parsed.data.university !== undefined ? { university: parsed.data.university } : {}),
    ...(parsed.data.universityId !== undefined ? { universityId: parsed.data.universityId } : {}),
    ...(parsed.data.universityAbbr !== undefined ? { universityAbbr: parsed.data.universityAbbr } : {}),
    ...(parsed.data.interestTagIds !== undefined ? { interestTagIds: parsed.data.interestTagIds } : {}),
    ...(parsed.data.dataPrivacyAccepted !== undefined
      ? { dataPrivacyAccepted: parsed.data.dataPrivacyAccepted }
      : {}),
    ...(parsed.data.onboardingComplete !== undefined
      ? { onboardingComplete: parsed.data.onboardingComplete }
      : {}),
  };

  const user = await upsertOnboardingProfile({
    userId,
    displayName,
    email,
    university: nextMeta.university,
    universityId: nextMeta.universityId,
    role: nextMeta.role,
    onboardingComplete: nextMeta.onboardingComplete,
  });

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: nextMeta,
  });

  return ok({
    profile: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      university: user.university,
      universityId: user.universityId,
      role: user.role,
      onboardingComplete: user.onboardingComplete,
      universityAbbr: nextMeta.universityAbbr,
      interestTagIds: nextMeta.interestTagIds,
      dataPrivacyAccepted: nextMeta.dataPrivacyAccepted,
    },
    publicMetadata: nextMeta,
  });
}
