import { readFileSync } from "node:fs";

function loadEnvKey(name) {
  try {
    const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(new RegExp(`^${name}\\s*=\\s*(.*)$`));
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* ignore */
  }
  return process.env[name]?.trim();
}

const apiKey = loadEnvKey("PEEKALINK_API_KEY");
const link = process.argv[2] ?? "https://www.instagram.com/p/DVMQNt6AWXq/";

if (!apiKey) {
  console.error("Missing PEEKALINK_API_KEY in .env");
  process.exit(1);
}

const response = await fetch("https://api.peekalink.io/", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify({ link }),
});

const data = await response.json();
console.log("status", response.status);
console.log(JSON.stringify(data, null, 2));
