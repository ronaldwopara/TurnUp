/**
 * Maps internal failures to short, user-safe API messages.
 * Full errors are logged server-side only — never returned to clients.
 */
export function clientSafeErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error && typeof error === "object" && "message" in error) {
    const raw = (error as { message?: unknown }).message;
    if (typeof raw === "string" && isSafeToExpose(raw)) {
      return raw;
    }
  }
  return fallback;
}

/** Only allow brief, non-technical messages intended for end users. */
function isSafeToExpose(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 120) return false;

  const blocked =
    /prisma|invalid\s+`|unknown argument|invocation in|turbopack|__turbopack|\.ts:\d+|node_modules|stack trace|error code/i;
  if (blocked.test(trimmed)) return false;

  return true;
}

export function logServerError(context: string, error: unknown): void {
  console.error(`[${context}]`, error);
}
