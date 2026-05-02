/**
 * Discoveries store — persists liked events, captured flyers, and user profile data.
 * Uses localStorage with a size cap to avoid quota issues.
 */

const STORAGE_KEYS = {
  LIKED_EVENTS: "turnup_liked_events",
  CAPTURES: "turnup_captures",
  PROFILE: "turnup_profile",
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
  universityAbbr?: string;
  role?: "student" | "organiser";
  dataPrivacyAccepted?: boolean;
};

export function hasDeckCredentials(profileOverride?: UserProfile | null): boolean {
  const profile = profileOverride ?? getUserProfile();
  const email = profile?.schoolEmail?.trim() ?? "";
  return email.includes("@");
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
  } catch {
    // ignore localStorage write failures
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
