import { badRequest, ok, unauthorized } from "@/lib/api/http";
import { insightsBodySchema } from "@/lib/api/schemas";
import { requireUserId } from "@/lib/auth/requireUser";
import { regenerateInsightsForUser } from "@/lib/jobs/insights";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return unauthorized();
  }

  const body = await request.json().catch(() => ({}));
  const parsed = insightsBodySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid insights regeneration request.", parsed.error.flatten());
  }

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
