import { ok, badRequest } from "@/lib/api/http";

export const runtime = "nodejs";

type NominatimResult = {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    province?: string;
    country?: string;
  };
};

type SchoolEntry = { name: string; abbreviation: string };

const REGION_SCHOOL_MAP: Array<{ pattern: RegExp; schools: SchoolEntry[] }> = [
  {
    pattern: /\balberta|edmonton|calgary\b/i,
    schools: [
      { name: "University of Alberta", abbreviation: "UAlberta" },
      { name: "MacEwan University", abbreviation: "MU" },
      { name: "NAIT", abbreviation: "NAIT" },
      { name: "University of Calgary", abbreviation: "UCalgary" },
    ],
  },
  {
    pattern: /\bbritish columbia|vancouver|burnaby\b/i,
    schools: [
      { name: "University of British Columbia", abbreviation: "UBC" },
      { name: "Simon Fraser University", abbreviation: "SFU" },
      { name: "British Columbia Institute of Technology", abbreviation: "BCIT" },
    ],
  },
  {
    pattern: /\bontario|toronto|ottawa|waterloo\b/i,
    schools: [
      { name: "University of Toronto", abbreviation: "UofT" },
      { name: "York University", abbreviation: "YU" },
      { name: "Toronto Metropolitan University", abbreviation: "TMU" },
      { name: "University of Waterloo", abbreviation: "UW" },
    ],
  },
];

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ city: string; region: string; country: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "TurnUp/1.0 (student-events-app)" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult;
    const a = data.address;
    if (!a) return null;
    const city = a.city || a.town || a.village || a.county || "";
    const region = a.state || a.province || "";
    const country = a.country || "";
    if (!city) return null;
    return { city, region, country };
  } catch {
    return null;
  }
}

function normalizeAbbreviation(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, "").slice(0, 12);
}

function deterministicNearbySchools(locationLabel: string): SchoolEntry[] {
  for (const entry of REGION_SCHOOL_MAP) {
    if (entry.pattern.test(locationLabel)) {
      return entry.schools;
    }
  }
  return [
    { name: "Local University", abbreviation: "UNI" },
    { name: "Local College", abbreviation: "COL" },
    { name: "Regional Polytechnic Institute", abbreviation: "RPI" },
  ];
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    lat?: number;
    lng?: number;
  } | null;

  const lat = body?.lat;
  const lng = body?.lng;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return badRequest("lat and lng are required");
  }

  const geo = await reverseGeocode(lat, lng);
  if (!geo) {
    return badRequest("Could not determine location from coordinates");
  }

  const locationLabel = [geo.city, geo.region, geo.country].filter(Boolean).join(", ");
  const schools = deterministicNearbySchools(locationLabel).map((school) => ({
    name: school.name.trim(),
    abbreviation: normalizeAbbreviation(school.abbreviation),
  }));

  return ok({
    city: geo.city,
    region: geo.region,
    country: geo.country,
    schools,
  });
}
