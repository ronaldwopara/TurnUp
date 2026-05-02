import { describe, expect, it } from "vitest";
import { imageBase64BodySchema, socialLinkBodySchema, stashBodySchema } from "../lib/api/schemas";

describe("API schemas", () => {
  it("validates social link payload", () => {
    const parsed = socialLinkBodySchema.safeParse({
      userId: "demo-user",
      url: "https://www.tiktok.com/@turnup/video/1234",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects stash payload without title", () => {
    const parsed = stashBodySchema.safeParse({
      userId: "demo-user",
      itemType: "link",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts base64 image payload", () => {
    const parsed = imageBase64BodySchema.safeParse({
      userId: "demo-user",
      mimeType: "image/jpeg",
      base64Image: "Zm9v",
    });
    expect(parsed.success).toBe(true);
  });
});
