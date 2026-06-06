"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

import { clearClerkUserId, clearUserProfile } from "@/lib/discoveries-store";

function isClerkSessionNetworkError(reason: unknown): boolean {
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : "";
  return (
    message.includes("ClerkJS: Network error") ||
    (message.includes("Failed to fetch") &&
      (message.includes("/sessions/") || message.includes("clerk.accounts.dev")))
  );
}

/**
 * Clears stale Clerk sessions when token refresh fails (common in keyless dev mode).
 */
export default function ClerkNetworkRecovery() {
  const { signOut } = useClerk();
  const recoveryInFlight = useRef(false);

  useEffect(() => {
    const recover = async (reason: unknown) => {
      if (recoveryInFlight.current || !isClerkSessionNetworkError(reason)) {
        return;
      }
      recoveryInFlight.current = true;
      try {
        clearUserProfile();
        clearClerkUserId();
        await signOut({ redirectUrl: "/" });
      } catch {
        recoveryInFlight.current = false;
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      void recover(event.reason);
    };

    const onError = (event: ErrorEvent) => {
      void recover(event.error ?? event.message);
    };

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, [signOut]);

  return null;
}
