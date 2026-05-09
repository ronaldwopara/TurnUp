import { addDays, format, isSameDay, startOfDay } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type University = { id: string; abbr: string; name: string; city: string };

export type AmenityId = "food" | "giveaways" | "perks";

export type BrowseRowId =
  | "party"
  | "live_performances"
  | "activities"
  | "food_drink"
  | "art_fashion"
  | "networking"
  | "dating";

export type EventItem = {
  id: number;
  title: string;
  tag: string;
  date: string;
  eventDate: Date;
  priceUsd: number;
  amenities: AmenityId[];
  color: string;
  accent: string;
  tall: boolean;
  browseRow?: BrowseRowId;
};

/** Applied browse date filter — quick picks use month / weekend / tonight; calendar uses day */
export type AppliedDateFilter =
  | { mode: "day"; date: Date }
  | { mode: "month"; monthStart: Date }
  | { mode: "weekend"; saturday: Date }
  | { mode: "tonight"; date: Date };

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Short campus codes — same metro, students recognize them.
 * Full `name` kept for search until onboarding/API wiring.
 */
export const UNIVERSITIES: University[] = [
  { id: "ualberta", abbr: "UAlberta", name: "University of Alberta", city: "Edmonton" },
  { id: "macewan", abbr: "MacEwan", name: "MacEwan University", city: "Edmonton" },
  { id: "nait", abbr: "NAIT", name: "Northern Alberta Institute of Technology", city: "Edmonton" },
  { id: "uofc", abbr: "UCalgary", name: "University of Calgary", city: "Calgary" },
  { id: "mru", abbr: "MRU", name: "Mount Royal University", city: "Calgary" },
  { id: "nyu", abbr: "NYU", name: "New York University", city: "New York" },
  { id: "columbia", abbr: "Columbia", name: "Columbia University", city: "New York" },
  { id: "cornell", abbr: "Cornell", name: "Cornell University", city: "Ithaca" },
  { id: "miami", abbr: "UMiami", name: "University of Miami", city: "Miami" },
  { id: "fiu", abbr: "FIU", name: "Florida International University", city: "Miami" },
  { id: "ucla", abbr: "UCLA", name: "UCLA", city: "Los Angeles" },
  { id: "usc", abbr: "USC", name: "USC", city: "Los Angeles" },
  { id: "ualberta", abbr: "UAlberta", name: "University of Alberta", city: "Edmonton" },
  { id: "nait", abbr: "NAIT", name: "Northern Alberta Institute of Technology", city: "Edmonton" },
  { id: "macewan", abbr: "MacEwan", name: "MacEwan University", city: "Edmonton" },
  { id: "georgetown", abbr: "Georgetown", name: "Georgetown University", city: "Washington DC" },
  { id: "gw", abbr: "GW", name: "George Washington University", city: "Washington DC" },
  { id: "bu", abbr: "BU", name: "Boston University", city: "Boston" },
  { id: "mit", abbr: "MIT", name: "MIT", city: "Boston" },
];

/**
 * TODO(onboarding): replace with school chosen during onboarding (prop/context/API).
 */
export const ONBOARDING_HOME_UNIVERSITY_ID = "nyu";

export function normalizeCityName(city: string): string {
  return city.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function universitiesForCity(city: string): University[] {
  const normalized = normalizeCityName(city);
  if (!normalized) return [];
  return UNIVERSITIES.filter((school) => {
    const schoolCity = normalizeCityName(school.city);
    return schoolCity === normalized || schoolCity.includes(normalized) || normalized.includes(schoolCity);
  });
}

// ─── Location helpers (lightweight) ───────────────────────────────────────────

type MetroCenter = { city: University["city"]; lat: number; lng: number };

const METRO_CENTERS: MetroCenter[] = [
  { city: "New York", lat: 40.7128, lng: -74.006 },
  { city: "Miami", lat: 25.7617, lng: -80.1918 },
  { city: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { city: "Edmonton", lat: 53.5461, lng: -113.4938 },
  { city: "Washington DC", lat: 38.9072, lng: -77.0369 },
  { city: "Boston", lat: 42.3601, lng: -71.0589 },
  { city: "Ithaca", lat: 42.443, lng: -76.5019 },
] as const;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function inferNearestCityFromCoords(lat: number, lng: number): University["city"] | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let best: { city: University["city"]; dist: number } | null = null;
  for (const c of METRO_CENTERS) {
    const d = haversineKm({ lat, lng }, c);
    if (!best || d < best.dist) best = { city: c.city, dist: d };
  }
  return best?.city ?? null;
}

export function inferNearestUniversityIdFromCoords(lat: number, lng: number): string | null {
  const city = inferNearestCityFromCoords(lat, lng);
  if (!city) return null;
  const first = UNIVERSITIES.find((u) => u.city === city);
  return first?.id ?? null;
}

export const AMENITY_OPTIONS: { id: AmenityId; label: string }[] = [
  { id: "food", label: "Food" },
  { id: "giveaways", label: "Giveaways" },
  { id: "perks", label: "Discount/Exclusive Perks" },
];

export const BROWSE_OTHER_SECTIONS: { id: BrowseRowId; label: string }[] = [
  { id: "party", label: "Party" },
  { id: "live_performances", label: "Live Performances" },
  { id: "activities", label: "Activities" },
  { id: "food_drink", label: "Food & Drink" },
  { id: "art_fashion", label: "Art & Fashion" },
  { id: "networking", label: "Networking" },
  { id: "dating", label: "Dating" },
];

/** Slider position (0–100) maps into these bands for the header label */
export const PRICE_TIER_LABELS = ["Free - $20", "Free - $50", "Free - $100", "Free - $200", "Any"] as const;

/** Max ticket price included when that tier is applied (tier 4 = no max) */
export const PRICE_TIER_CAPS_USD = [20, 50, 100, 200] as const;

// ─── Event catalog ────────────────────────────────────────────────────────────

const TRENDING_EVENTS: EventItem[] = [
  { id: 1, title: "Rooftop Jazz & Wine Night", tag: "Music", date: "Fri May 9 · 8pm", eventDate: new Date(2026, 4, 9), priceUsd: 25, amenities: ["food", "giveaways"], color: "#1a1230", accent: "#9b72cf", tall: true },
  { id: 2, title: "Campus Art Showcase", tag: "Art", date: "Sat May 10 · 2pm", eventDate: new Date(2026, 4, 10), priceUsd: 0, amenities: ["perks"], color: "#0d1f14", accent: "#4ade80", tall: true },
  { id: 3, title: "Friday Night Run Club", tag: "Fitness", date: "Fri May 9 · 6am", eventDate: new Date(2026, 4, 9), priceUsd: 15, amenities: ["giveaways"], color: "#1a0e0e", accent: "#f87171", tall: false },
  { id: 4, title: "Hackathon 2025", tag: "Tech", date: "May 11–12", eventDate: new Date(2026, 4, 11), priceUsd: 45, amenities: ["food", "perks"], color: "#0d1520", accent: "#60a5fa", tall: false },
  { id: 5, title: "Open Mic Night", tag: "Performance", date: "Thu May 8 · 7pm", eventDate: new Date(2026, 4, 8), priceUsd: 12, amenities: ["giveaways", "perks"], color: "#1a1500", accent: "#fbbf24", tall: true },
  { id: 6, title: "Paint & Sip Social", tag: "Art", date: "Sun May 11 · 4pm", eventDate: new Date(2026, 4, 11), priceUsd: 35, amenities: ["food"], color: "#0f0d1a", accent: "#c084fc", tall: false },
  { id: 7, title: "Startup Mixer", tag: "Networking", date: "Wed May 14 · 6pm", eventDate: new Date(2026, 4, 14), priceUsd: 75, amenities: ["perks", "giveaways"], color: "#0d1a1a", accent: "#2dd4bf", tall: false },
  { id: 8, title: "Block Party BBQ", tag: "Social", date: "Sat May 17 · 1pm", eventDate: new Date(2026, 4, 17), priceUsd: 18, amenities: ["food", "giveaways", "perks"], color: "#1a0f05", accent: "#fb923c", tall: true },
];

const OTHER_ROW_EVENTS: EventItem[] = [
  {
    id: 9,
    title: "Neon Velvet Dance Party",
    tag: "Party",
    date: "Fri May 23 · 10pm",
    eventDate: new Date(2026, 4, 23),
    priceUsd: 22,
    amenities: ["food", "giveaways"],
    color: "#1a0a2e",
    accent: "#e879f9",
    tall: true,
    browseRow: "party",
  },
  {
    id: 10,
    title: "House Party: Pride Edition",
    tag: "Party",
    date: "Sat May 24 · 9pm",
    eventDate: new Date(2026, 4, 24),
    priceUsd: 15,
    amenities: ["perks"],
    color: "#2e1065",
    accent: "#a78bfa",
    tall: false,
    browseRow: "party",
  },
  {
    id: 11,
    title: "Unplugged & Amplified",
    tag: "Live",
    date: "Thu May 22 · 7pm",
    eventDate: new Date(2026, 4, 22),
    priceUsd: 18,
    amenities: ["food", "perks"],
    color: "#1c1917",
    accent: "#f59e0b",
    tall: false,
    browseRow: "live_performances",
  },
  {
    id: 12,
    title: "Stand-Up & Stories",
    tag: "Comedy",
    date: "Sun May 25 · 6pm",
    eventDate: new Date(2026, 4, 25),
    priceUsd: 20,
    amenities: ["giveaways"],
    color: "#0f172a",
    accent: "#38bdf8",
    tall: true,
    browseRow: "live_performances",
  },
  {
    id: 13,
    title: "Boardwalk Bike Social",
    tag: "Outdoors",
    date: "Sat May 10 · 9am",
    eventDate: new Date(2026, 4, 10),
    priceUsd: 0,
    amenities: ["giveaways"],
    color: "#052e16",
    accent: "#4ade80",
    tall: true,
    browseRow: "activities",
  },
  {
    id: 14,
    title: "Pottery & Coffee Morning",
    tag: "Workshop",
    date: "Sun May 11 · 10am",
    eventDate: new Date(2026, 4, 11),
    priceUsd: 42,
    amenities: ["food", "perks"],
    color: "#292524",
    accent: "#d6d3d1",
    tall: false,
    browseRow: "activities",
  },
  {
    id: 21,
    title: "Night Market Bites & Beats",
    tag: "Food",
    date: "Thu May 29 · 7pm",
    eventDate: new Date(2026, 4, 29),
    priceUsd: 12,
    amenities: ["food", "giveaways", "perks"],
    color: "#422006",
    accent: "#fbbf24",
    tall: true,
    browseRow: "food_drink",
  },
  {
    id: 22,
    title: "Rooftop Wine & Vinyl",
    tag: "Tasting",
    date: "Fri May 30 · 6pm",
    eventDate: new Date(2026, 4, 30),
    priceUsd: 55,
    amenities: ["food", "perks"],
    color: "#3f0d12",
    accent: "#fda4af",
    tall: false,
    browseRow: "food_drink",
  },
  {
    id: 15,
    title: "Runway After Dark",
    tag: "Fashion",
    date: "Fri May 16 · 8pm",
    eventDate: new Date(2026, 4, 16),
    priceUsd: 35,
    amenities: ["perks", "giveaways"],
    color: "#18181b",
    accent: "#f472b6",
    tall: true,
    browseRow: "art_fashion",
  },
  {
    id: 16,
    title: "Vintage Pop-Up Market",
    tag: "Market",
    date: "Sat May 17 · 11am",
    eventDate: new Date(2026, 4, 17),
    priceUsd: 0,
    amenities: ["food", "giveaways"],
    color: "#292524",
    accent: "#fdba74",
    tall: false,
    browseRow: "art_fashion",
  },
  {
    id: 17,
    title: "VC & Pizza Night",
    tag: "Networking",
    date: "Wed May 21 · 6pm",
    eventDate: new Date(2026, 4, 21),
    priceUsd: 0,
    amenities: ["food", "perks"],
    color: "#0c4a6e",
    accent: "#7dd3fc",
    tall: false,
    browseRow: "networking",
  },
  {
    id: 18,
    title: "Creative Connect Hour",
    tag: "Networking",
    date: "Tue May 20 · 5pm",
    eventDate: new Date(2026, 4, 20),
    priceUsd: 12,
    amenities: ["giveaways"],
    color: "#134e4a",
    accent: "#5eead4",
    tall: true,
    browseRow: "networking",
  },
  {
    id: 19,
    title: "Sushi & Spark Mini Dates",
    tag: "Dating",
    date: "Thu May 15 · 7pm",
    eventDate: new Date(2026, 4, 15),
    priceUsd: 48,
    amenities: ["food", "perks"],
    color: "#3b0764",
    accent: "#f0abfc",
    tall: true,
    browseRow: "dating",
  },
  {
    id: 20,
    title: "Rooftop Singles Social",
    tag: "Dating",
    date: "Sat May 18 · 6pm",
    eventDate: new Date(2026, 4, 18),
    priceUsd: 25,
    amenities: ["food", "giveaways"],
    color: "#450a0a",
    accent: "#fca5a5",
    tall: false,
    browseRow: "dating",
  },
];

export const ALL_EVENTS: EventItem[] = [...TRENDING_EVENTS, ...OTHER_ROW_EVENTS];

// ─── Helper functions ─────────────────────────────────────────────────────────

export function formatDateChipDisplay(f: AppliedDateFilter): string {
  switch (f.mode) {
    case "day":
      return format(f.date, "MMM d");
    case "tonight":
      return "Tonight";
    case "month":
      return "This Month";
    case "weekend":
      return "This Weekend";
  }
}

export function eventMatchesAppliedDate(ev: { eventDate: Date }, applied: AppliedDateFilter): boolean {
  const d = startOfDay(ev.eventDate);
  switch (applied.mode) {
    case "day":
    case "tonight":
      return isSameDay(d, startOfDay(applied.date));
    case "month":
      return (
        d.getFullYear() === applied.monthStart.getFullYear() &&
        d.getMonth() === applied.monthStart.getMonth()
      );
    case "weekend": {
      const sat = startOfDay(applied.saturday);
      const sun = addDays(sat, 1);
      return isSameDay(d, sat) || isSameDay(d, sun);
    }
  }
}

export function formatAmenitiesChip(ids: AmenityId[]): string {
  if (ids.length === 0) return "Amenities";
  const labels = ids.map((id) => AMENITY_OPTIONS.find((o) => o.id === id)?.label ?? id);
  if (labels.length <= 2) return labels.join(", ");
  return `${labels[0]}, +${labels.length - 1}`;
}

export function eventMatchesAmenities(ev: { amenities: AmenityId[] }, selected: AmenityId[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((a) => ev.amenities.includes(a));
}

export function tierFromSliderPercent(p: number): number {
  if (p >= 80) return 4;
  if (p >= 60) return 3;
  if (p >= 40) return 2;
  if (p >= 20) return 1;
  return 0;
}

/** Slider positions when syncing tier ↔ control (100% = thumb at end for "Any") */
export function sliderPercentForTier(tier: number): number {
  const centers = [10, 30, 50, 70, 100];
  return centers[Math.min(Math.max(tier, 0), 4)];
}

export function upcomingSaturday(from: Date): Date {
  const d = startOfDay(from);
  const day = d.getDay();
  if (day === 6) return d;
  const daysUntilSat = (6 - day + 7) % 7;
  return addDays(d, daysUntilSat === 0 ? 7 : daysUntilSat);
}
