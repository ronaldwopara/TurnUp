import { AMENITY_OPTIONS, type AmenityId, type EventItem } from "@/lib/browse-data";

export type BrowseEventDetail = {
  id: string;
  title: string;
  tag?: string;
  dateLabel?: string;
  priceLabel?: string;
  description?: string;
  location?: string;
  imageUrl?: string;
  sourceUrl?: string;
  color: string;
  accent: string;
  postedBy?: string;
  amenities?: string[];
  /** Numeric catalog id for localStorage likes */
  catalogId?: number;
  flyerId?: string;
  calendarUrl?: string;
};

export function layoutIdForBrowseEvent(id: string): string {
  return `browse-event-thumb-${id}`;
}

function formatPrice(usd: number): string {
  if (usd === 0) return "Free";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(usd);
}

function amenityLabels(ids: AmenityId[]): string[] {
  return ids
    .map((id) => AMENITY_OPTIONS.find((opt) => opt.id === id)?.label)
    .filter((label): label is string => Boolean(label));
}

export function buildCalendarUrlForEvent(event: EventItem): string {
  const title = encodeURIComponent(event.title);
  const eventDate = event.eventDate;
  const year = eventDate.getFullYear();
  const month = String(eventDate.getMonth() + 1).padStart(2, "0");
  const day = String(eventDate.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;
  const nextDay = new Date(eventDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const endDateStr = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, "0")}${String(nextDay.getDate()).padStart(2, "0")}`;
  return `https://calendar.google.com/calendar/u/0/r/eventedit?text=${title}&dates=${dateStr}/${endDateStr}`;
}

export function eventItemToDetail(event: EventItem): BrowseEventDetail {
  return {
    id: `catalog-${event.id}`,
    catalogId: event.id,
    title: event.title,
    tag: event.tag,
    dateLabel: event.date,
    priceLabel: formatPrice(event.priceUsd),
    description: event.description,
    location: event.location,
    imageUrl: event.imageUrl,
    sourceUrl: event.sourceUrl,
    calendarUrl: buildCalendarUrlForEvent(event),
    color: event.color,
    accent: event.accent,
    amenities: amenityLabels(event.amenities),
  };
}

export type CommunityFlyerDetailInput = {
  id: string;
  title: string;
  description?: string;
  eventDate?: string;
  price?: string;
  imageUrl?: string;
  sourceUrl?: string;
  calendarUrl?: string;
  color: string;
  accent: string;
  postedBy: string;
};

function trimOptional(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function formatCompactYyyyMmDd(input: string): string | null {
  const m = input.trim().match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  // Guard against Date overflow (e.g. 20260231).
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

/** Human-readable date/time line from ingest fields */
export function formatIngestEventSchedule(date?: string, time?: string): string | undefined {
  const rawDate = trimOptional(date);
  const d = rawDate ? formatCompactYyyyMmDd(rawDate) ?? rawDate : undefined;
  const t = trimOptional(time);
  if (d && t) return `${d} · ${t}`;
  return d ?? t;
}

export function flyerToDetail(flyer: CommunityFlyerDetailInput): BrowseEventDetail {
  return {
    id: `flyer-${flyer.id}`,
    flyerId: flyer.id,
    title: flyer.title,
    tag: "Community",
    dateLabel: trimOptional(flyer.eventDate),
    priceLabel: trimOptional(flyer.price),
    description: trimOptional(flyer.description),
    imageUrl: flyer.imageUrl,
    sourceUrl: flyer.sourceUrl,
    calendarUrl: trimOptional(flyer.calendarUrl),
    color: flyer.color,
    accent: flyer.accent,
    postedBy: flyer.postedBy,
  };
}
