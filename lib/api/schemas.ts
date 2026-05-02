import { z } from "zod";

export const userIdSchema = z.string().min(1).default("demo-user");

export const imageBase64BodySchema = z.object({
  userId: userIdSchema.optional(),
  base64Image: z.string().min(1),
  mimeType: z.string().default("image/jpeg"),
});

export const socialLinkBodySchema = z.object({
  userId: userIdSchema.optional(),
  url: z.string().url(),
});

export const stashBodySchema = z.object({
  userId: userIdSchema.optional(),
  itemType: z.enum(["document", "link", "image", "video"]),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  detailLabel: z.string().optional(),
  assetRef: z.string().optional(),
  sourceUrl: z.string().optional(),
});

export const insightsBodySchema = z.object({
  userId: userIdSchema.optional(),
});
