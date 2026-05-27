import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Crawler identity Instagram often serves richer OG markup to. */
export const SOCIAL_CRAWLER_HEADERS = {
  "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function htmlHasPostImage(html: string): boolean {
  return /property=["']og:image["']/i.test(html) || /scontent\.cdninstagram\.com\/v\//i.test(html);
}

export async function fetchHtmlViaCurl(url: string, userAgent?: string): Promise<string | null> {
  if (process.platform !== "win32") {
    return null;
  }

  const agent = userAgent ?? "facebookexternalhit/1.1";
  try {
    const { stdout } = await execFileAsync(
      "curl.exe",
      ["-sL", "-m", "25", "-A", agent, url],
      { maxBuffer: 12 * 1024 * 1024 },
    );
    return typeof stdout === "string" && stdout.length > 0 ? stdout : null;
  } catch {
    return null;
  }
}

function isInstagramUrl(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().includes("instagram.com");
  } catch {
    return false;
  }
}

function pickBetterInstagramHtml(fetchHtml: string | null, curlHtml: string | null): string | null {
  if (curlHtml && /scontent\.cdninstagram\.com\/v\//i.test(curlHtml)) {
    return curlHtml;
  }
  if (fetchHtml && htmlHasPostImage(fetchHtml)) {
    return fetchHtml;
  }
  return curlHtml ?? fetchHtml;
}

/** Fetch HTML for OG parsing; on Windows, curl is used when fetch omits Instagram poster tags. */
export async function fetchHtmlDocument(url: string): Promise<string | null> {
  let html: string | null = null;

  const headers = isInstagramUrl(url) ? SOCIAL_CRAWLER_HEADERS : BROWSER_HEADERS;

  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers,
    });
    if (response.ok) {
      html = await response.text();
      if (!isInstagramUrl(url) && htmlHasPostImage(html)) {
        return html;
      }
    }
  } catch {
    // try curl below
  }

  if (isInstagramUrl(url)) {
    const curlHtml = await fetchHtmlViaCurl(url, SOCIAL_CRAWLER_HEADERS["User-Agent"]);
    return pickBetterInstagramHtml(html, curlHtml);
  }

  const curlHtml = await fetchHtmlViaCurl(url);
  return curlHtml ?? html;
}
