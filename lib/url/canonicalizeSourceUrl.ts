export function canonicalizeSourceUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  // Ensure absolute URL for consistent parsing.
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);
    url.hash = "";

    // Normalize hostname.
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    // Remove common tracking params (keep the rest).
    const trackingKeys = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "utm_id",
      "utm_name",
      "utm_reader",
      "utm_referrer",
      "utm_social",
      "utm_social-type",
      "fbclid",
      "gclid",
      "igshid",
      "mc_cid",
      "mc_eid",
      "mkt_tok",
      "ref",
      "ref_src",
      "ref_url",
    ]);

    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (lower.startsWith("utm_") || trackingKeys.has(lower)) {
        url.searchParams.delete(key);
      }
    }

    // Stable ordering for comparison.
    url.searchParams.sort();

    // Normalize pathname (strip trailing slash except root).
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.toString();
  } catch {
    return trimmed;
  }
}

