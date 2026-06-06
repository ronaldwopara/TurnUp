/**
 * Discoveries store — persists liked events, captured flyers, and user profile data.
 * Uses localStorage with a size cap to avoid quota issues.
 */

const STORAGE_KEYS = {
  LIKED_EVENTS: "turnup_liked_events",
  CAPTURES: "turnup_captures",
  PROFILE: "turnup_profile",
  AI_SCHOOLS: "turnup_ai_schools",
  CLERK_USER_ID: "turnup_clerk_user_id",
} as const;

const MAX_CAPTURES = 50;
const MAX_CAPTURE_SIZE_KB = 500;

// ─── Types ────────────────────────────────────────────────────────────────────

export type CaptureItem = {
  id: string;
  dataUrl: string;
  createdAt: number;
};

export type UserProfile = {
  name: string;
  university: string;
  schoolEmail?: string;
  universityId?: string;
  locationCity?: string;
  availableUniversityIds?: string[];
  universityAbbr?: string;
  role?: "student" | "organiser";
  dataPrivacyAccepted?: boolean;
  /** Stable ids from `lib/interest-tags-data` (e.g. `career-professional:networking`). */
  interestTagIds?: string[];
};

export function hasDeckCredentials(profileOverride?: UserProfile | null): boolean {
  const clerkId = getClerkUserId();
  if (!clerkId) {
    const profile = profileOverride ?? getUserProfile();
    const email = profile?.schoolEmail?.trim() ?? "";
    return email.includes("@");
  }
  const profile = profileOverride ?? getUserProfile();
  return Boolean(profile?.dataPrivacyAccepted && (profile.universityId || profile.university));
}

export function setClerkUserId(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.CLERK_USER_ID, userId);
  } catch {
    // ignore
  }
}

export function getClerkUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.CLERK_USER_ID);
  } catch {
    return null;
  }
}

export function clearClerkUserId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.CLERK_USER_ID);
  } catch {
    // ignore
  }
}

export function clearDeckStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.LIKED_EVENTS);
    localStorage.removeItem(STORAGE_KEYS.CAPTURES);
  } catch {
    // ignore localStorage write failures
  }
}

// ─── Liked events ─────────────────────────────────────────────────────────────

export function getLikedEventIds(): number[] {
  if (typeof window === "undefined") return [];
  if (!hasDeckCredentials()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LIKED_EVENTS);
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

export function setLikedEventIds(ids: number[]): void {
  if (typeof window === "undefined") return;
  if (!hasDeckCredentials()) {
    clearDeckStorage();
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEYS.LIKED_EVENTS, JSON.stringify(ids));
  } catch (e) {
    console.error("Failed to save liked events:", e);
  }
}

export function toggleLikedEvent(eventId: number): boolean {
  if (!hasDeckCredentials()) {
    clearDeckStorage();
    return false;
  }
  const current = getLikedEventIds();
  const idx = current.indexOf(eventId);
  if (idx >= 0) {
    current.splice(idx, 1);
    setLikedEventIds(current);
    return false;
  } else {
    current.push(eventId);
    setLikedEventIds(current);
    return true;
  }
}

export function isEventLiked(eventId: number): boolean {
  return getLikedEventIds().includes(eventId);
}

// ─── Captures ─────────────────────────────────────────────────────────────────

export function getCaptures(): CaptureItem[] {
  if (typeof window === "undefined") return [];
  if (!hasDeckCredentials()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CAPTURES);
    if (!raw) return [];
    return JSON.parse(raw) as CaptureItem[];
  } catch {
    return [];
  }
}

function setCaptures(captures: CaptureItem[]): void {
  if (typeof window === "undefined") return;
  if (!hasDeckCredentials()) {
    clearDeckStorage();
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEYS.CAPTURES, JSON.stringify(captures));
  } catch (e) {
    console.error("Failed to save captures:", e);
  }
}

export function addCapture(dataUrl: string): CaptureItem | null {
  if (typeof window === "undefined") return null;
  if (!hasDeckCredentials()) {
    clearDeckStorage();
    return null;
  }

  const sizeKB = dataUrl.length / 1024;
  if (sizeKB > MAX_CAPTURE_SIZE_KB) {
    console.warn(`Capture too large (${sizeKB.toFixed(0)}KB), skipping`);
    return null;
  }

  const item: CaptureItem = {
    id: `capture_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    dataUrl,
    createdAt: Date.now(),
  };

  const current = getCaptures();
  current.unshift(item);

  if (current.length > MAX_CAPTURES) {
    current.splice(MAX_CAPTURES);
  }

  setCaptures(current);
  return item;
}

export function deleteCapture(captureId: string): void {
  const current = getCaptures();
  const filtered = current.filter((c) => c.id !== captureId);
  setCaptures(filtered);
}

// ─── User profile ─────────────────────────────────────────────────────────────

export function getUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function setUserProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error("Failed to save user profile:", e);
  }
}

export function clearUserProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    clearClerkUserId();
  } catch {
    // ignore localStorage write failures
  }
}

export function getUserId(): string {
  const clerkId = getClerkUserId();
  if (clerkId) return clerkId;
  const profile = getUserProfile();
  const email = profile?.schoolEmail?.trim().toLowerCase();
  if (email && email.includes("@")) return email;
  return "demo-user";
}

// ─── AI-generated schools ─────────────────────────────────────────────────────

export type AiSchool = {
  id: string;
  name: string;
  abbr: string;
  city: string;
};

export function getAiSchools(): AiSchool[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AI_SCHOOLS);
    if (!raw) return [];
    return JSON.parse(raw) as AiSchool[];
  } catch {
    return [];
  }
}

export function setAiSchools(schools: AiSchool[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.AI_SCHOOLS, JSON.stringify(schools));
  } catch (e) {
    console.error("Failed to save AI schools:", e);
  }
}

export function clearAiSchools(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.AI_SCHOOLS);
  } catch {
    // ignore
  }
}

// ─── Combined discovery count ─────────────────────────────────────────────────

export function getDiscoveryCount(): number {
  return getLikedEventIds().length + getCaptures().length;
}

/** Build a mailto link for “export my data” (client-side snapshot). */
export function buildExportDataMailto(): string {
  const profile = getUserProfile();
  const likes = getLikedEventIds();
  const captures = getCaptures();
  const payload = {
    exportedAt: new Date().toISOString(),
    profile,
    likedEventIds: likes,
    captureCount: captures.length,
    captureIds: captures.map((c) => c.id),
  };
  const body = encodeURIComponent(
    `Please send me a copy of my TurnUp data.\n\n---\n${JSON.stringify(payload, null, 2)}\n---`,
  );
  const email = profile?.schoolEmail?.trim() || "";
  const to = email && email.includes("@") ? email : "";
  return `mailto:${to}?subject=${encodeURIComponent("TurnUp — my data export")}&body=${body}`;
}
