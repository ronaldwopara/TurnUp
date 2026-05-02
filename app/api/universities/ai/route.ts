import { ok } from "@/lib/api/http";
import { callStructuredLlm } from "@/lib/llm/client";
import { UNIVERSITIES, type University } from "@/lib/browse-data";

export const runtime = "nodejs";

const ORDER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["orderedIds"],
  properties: {
    orderedIds: {
      type: "array",
      items: { type: "string" },
      description: "University IDs ordered by best match first.",
    },
  },
} as const;

const ABBR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["abbr"],
  properties: {
    abbr: {
      type: "string",
      description:
        "A short campus abbreviation (2–10 chars) students would recognize, e.g. NYU, UCLA, UMiami, GW, Columbia. No emojis.",
    },
  },
} as const;

function normalizeAbbr(input: string): string {
  const trimmed = (input ?? "").trim();
  const safe = trimmed.replace(/[^a-zA-Z0-9]/g, "");
  return safe.slice(0, 10) || trimmed.slice(0, 10) || "";
}

function fallbackOrder(cityHint?: string | null): string[] {
  if (cityHint) {
    const nearby = UNIVERSITIES.filter((u) => u.city.toLowerCase() === cityHint.toLowerCase()).map((u) => u.id);
    const rest = UNIVERSITIES.filter((u) => u.city.toLowerCase() !== cityHint.toLowerCase()).map((u) => u.id);
    return [...nearby, ...rest];
  }
  return UNIVERSITIES.map((u) => u.id);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        cityHint?: string | null;
        selectedUniversityId?: string | null;
        universityNameForAbbr?: string | null;
      }
    | null;

  const cityHint = body?.cityHint ?? null;
  const selectedUniversityId = body?.selectedUniversityId ?? null;
  const uniNameForAbbr = body?.universityNameForAbbr ?? null;

  const universities: Array<Pick<University, "id" | "name" | "abbr" | "city">> = UNIVERSITIES.map((u) => ({
    id: u.id,
    name: u.name,
    abbr: u.abbr,
    city: u.city,
  }));

  const ordered = await callStructuredLlm<{ orderedIds: string[] }>({
    jsonSchemaName: "UniversityOrder",
    jsonSchema: ORDER_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You are ranking universities for a dropdown. Prefer the user's city/metro. " +
          "Return only IDs from the provided list, no extra text.",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            cityHint,
            selectedUniversityId,
            universities,
          },
          null,
          2,
        ),
      },
    ],
  });

  const orderedIdsRaw = ordered?.orderedIds ?? fallbackOrder(cityHint);
  const universe = new Set(UNIVERSITIES.map((u) => u.id));
  const orderedIds = [
    ...orderedIdsRaw.filter((id) => universe.has(id)),
    ...UNIVERSITIES.map((u) => u.id).filter((id) => !orderedIdsRaw.includes(id)),
  ];

  let abbr: string | null = null;
  if (uniNameForAbbr) {
    const aiAbbr = await callStructuredLlm<{ abbr: string }>({
      jsonSchemaName: "UniversityAbbr",
      jsonSchema: ABBR_SCHEMA as unknown as Record<string, unknown>,
      temperature: 0.2,
      messages: [
        { role: "system", content: "Generate a short campus abbreviation. Return JSON only." },
        {
          role: "user",
          content: JSON.stringify(
            {
              universityName: uniNameForAbbr,
              examples: ["NYU", "UCLA", "USC", "UMiami", "GW", "MIT", "BU", "Columbia"],
            },
            null,
            2,
          ),
        },
      ],
    });
    abbr = normalizeAbbr(aiAbbr?.abbr ?? "");
  }

  return ok({ orderedIds, abbr });
}

