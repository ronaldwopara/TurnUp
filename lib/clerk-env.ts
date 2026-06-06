/** True when real Clerk keys are set (not relying on ephemeral keyless dev mode). */
export function hasClerkKeysConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
      process.env.CLERK_SECRET_KEY?.trim(),
  );
}

export const clerkProviderProps = {
  signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in",
  signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? "/sign-up",
  signInFallbackRedirectUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ?? "/",
  signUpFallbackRedirectUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ?? "/",
  afterSignOutUrl: "/",
} as const;
