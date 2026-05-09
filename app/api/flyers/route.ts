import { ok, badRequest } from "@/lib/api/http";
import { createFlyer, getPublishedFlyers } from "@/lib/repos/flyersRepo";
import { z } from "zod";

export const runtime = "nodejs";

const createFlyerSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  eventDate: z.string().optional(),
  price: z.string().optional(),
  imageUrl: z.string().optional(),
  color: z.string().optional(),
  accent: z.string().optional(),
  displayName: z.string().optional(),
});

export async function GET() {
  try {
    const flyers = await getPublishedFlyers();
    return ok(flyers);
  } catch (error) {
    console.error("Failed to fetch flyers:", error);
    return ok([]);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createFlyerSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid flyer data", parsed.error.flatten());
  }

  try {
    const flyer = await createFlyer(parsed.data);

    return ok({
      id: flyer.id,
      title: flyer.title,
      description: flyer.description,
      eventDate: flyer.eventDate,
      price: flyer.price,
      imageUrl: flyer.imageUrl,
      color: flyer.color,
      accent: flyer.accent,
      createdAt: flyer.createdAt,
    });
  } catch (error) {
    console.error("Failed to create flyer:", error);
    return badRequest("Failed to create flyer. Database tables may not exist.");
  }
}
