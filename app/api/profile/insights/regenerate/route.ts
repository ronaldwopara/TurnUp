import { badRequest, ok } from "@/lib/api/http";
import { insightsBodySchema } from "@/lib/api/schemas";
import { regenerateInsightsForUser } from "@/lib/jobs/insights";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = insightsBodySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid insights regeneration request.", parsed.error.flatten());
  }

  const userId = parsed.data.userId ?? "demo-user";
  const learnedFacts = await regenerateInsightsForUser(userId);
  return ok({
    userId,
    learnedFacts: learnedFacts.map((fact) => ({
      id: fact.id,
      text: fact.text,
      type: fact.factType,
      confidence: fact.confidence,
      generatedAt: fact.generatedAt,
    })),
  });
}
