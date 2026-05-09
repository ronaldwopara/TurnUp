import { ok, badRequest } from "@/lib/api/http";
import { callStructuredLlm } from "@/lib/llm/client";

export const runtime = "nodejs";

const SCHOOLS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["schools"],
  properties: {
    schools: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "abbreviation"],
        properties: {
          name: {
            type: "string",
            description: "Full official name of the post-secondary institution.",
          },
          abbreviation: {
            type: "string",
            description:
              "Short commonly used abbreviation, 2–6 uppercase characters, no spaces.",
          },
        },
      },
      description: "3–5 post-secondary institutions in or directly serving the area.",
    },
  },
} as const;

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

  const locationLabel =
    geo.region && geo.country
      ? `${geo.city}, ${geo.region}, ${geo.country}`
      : geo.city;

  const result = await callStructuredLlm<{ schools: SchoolEntry[] }>({
    jsonSchemaName: "NearbySchools",
    jsonSchema: SCHOOLS_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are generating a list of post-secondary institutions for a location-based dropdown.\n\n" +
          "Rules:\n" +
          "- Only include universities and colleges located in or directly serving this area.\n" +
          "- Do NOT include schools outside this region.\n" +
          "- Keep the list concise (3 to 5 schools).\n" +
          "- For each school provide the full official name and a short commonly used abbreviation (2–6 uppercase characters, no spaces).\n" +
          "- Return JSON only.",
      },
      {
        role: "user",
        content: `User location: ${locationLabel}`,
      },
    ],
  });

  const schools: SchoolEntry[] = (result?.schools ?? [])
    .filter(
      (s): s is SchoolEntry =>
        typeof s.name === "string" &&
        typeof s.abbreviation === "string" &&
        s.name.length > 0 &&
        s.abbreviation.length > 0,
    )
    .map((s) => ({
      name: s.name.trim(),
      abbreviation: s.abbreviation.trim().replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6),
    }));

  return ok({
    city: geo.city,
    region: geo.region,
    country: geo.country,
    schools,
  });
}
