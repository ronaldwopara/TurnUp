import { describe, expect, it } from "vitest";

import { getApiBaseUrl } from "@/lib/api-client";

describe("api-client", () => {
  it("uses EXPO_PUBLIC_API_URL without trailing slash", () => {
    expect(getApiBaseUrl()).not.toMatch(/\/$/);
  });
});
