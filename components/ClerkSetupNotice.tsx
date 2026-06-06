"use client";

import { hasClerkKeysConfigured } from "@/lib/clerk-env";

export default function ClerkSetupNotice() {
  if (hasClerkKeysConfigured()) {
    return null;
  }

  return (
    <div className="clerk-setup-notice" role="status">
      <strong>Clerk is not configured.</strong> Add{" "}
      <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and <code>CLERK_SECRET_KEY</code> to your{" "}
      <code>.env</code> file (see <code>.env.example</code>). Keyless dev mode causes unstable sessions
      and &quot;Failed to fetch&quot; errors.
    </div>
  );
}
