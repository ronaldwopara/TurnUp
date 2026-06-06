"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect } from "react";

import { parseTurnUpPublicMetadata } from "@/lib/auth/clerkMetadata";
import {
  getUserProfile,
  setClerkUserId,
  setUserProfile,
  type UserProfile,
} from "@/lib/discoveries-store";

export function useTurnUpUser() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const metadata = parseTurnUpPublicMetadata(user?.publicMetadata as Record<string, unknown> | undefined);

  useEffect(() => {
    if (isSignedIn && userId) {
      setClerkUserId(userId);
    }
  }, [isSignedIn, userId]);

  return {
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    userId: userId ?? null,
    user,
    metadata,
    onboardingComplete: metadata.onboardingComplete === true,
  };
}

export function buildLocalProfileFromClerk(input: {
  user: ReturnType<typeof useUser>["user"];
  metadata: ReturnType<typeof parseTurnUpPublicMetadata>;
}): UserProfile {
  const name =
    input.user?.fullName?.trim() ||
    [input.user?.firstName, input.user?.lastName].filter(Boolean).join(" ").trim() ||
    "";
  const schoolEmail = input.user?.primaryEmailAddress?.emailAddress ?? "";

  return {
    name,
    university: input.metadata.university ?? "",
    universityId: input.metadata.universityId,
    universityAbbr: input.metadata.universityAbbr,
    schoolEmail,
    role: input.metadata.role,
    dataPrivacyAccepted: input.metadata.dataPrivacyAccepted,
    interestTagIds: input.metadata.interestTagIds,
  };
}

export function syncLocalProfileFromClerk(input: {
  user: ReturnType<typeof useUser>["user"];
  metadata: ReturnType<typeof parseTurnUpPublicMetadata>;
}) {
  const existing = getUserProfile();
  const fromClerk = buildLocalProfileFromClerk(input);
  setUserProfile({
    ...(existing ?? { name: "", university: "" }),
    ...fromClerk,
    locationCity: existing?.locationCity,
    availableUniversityIds: existing?.availableUniversityIds,
  });
}
