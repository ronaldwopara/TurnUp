export type TurnUpPublicMetadata = {
  role?: "student" | "organiser";
  universityId?: string;
  university?: string;
  universityAbbr?: string;
  interestTagIds?: string[];
  onboardingComplete?: boolean;
  dataPrivacyAccepted?: boolean;
};

export function parseTurnUpPublicMetadata(metadata: Record<string, unknown> | undefined): TurnUpPublicMetadata {
  if (!metadata) return {};
  const role = metadata.role;
  return {
    role: role === "student" || role === "organiser" ? role : undefined,
    universityId: typeof metadata.universityId === "string" ? metadata.universityId : undefined,
    university: typeof metadata.university === "string" ? metadata.university : undefined,
    universityAbbr: typeof metadata.universityAbbr === "string" ? metadata.universityAbbr : undefined,
    interestTagIds: Array.isArray(metadata.interestTagIds)
      ? metadata.interestTagIds.filter((id): id is string => typeof id === "string")
      : undefined,
    onboardingComplete: metadata.onboardingComplete === true,
    dataPrivacyAccepted: metadata.dataPrivacyAccepted === true,
  };
}
