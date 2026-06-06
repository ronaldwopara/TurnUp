"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";

import { turnUpClerkAppearance } from "@/lib/clerkAppearance";

type AuthScreenProps = {
  onAuthenticated: () => void;
  isSignedIn: boolean;
  isLoaded: boolean;
};

export default function AuthScreen({ onAuthenticated, isSignedIn, isLoaded }: AuthScreenProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      onAuthenticated();
    }
  }, [isLoaded, isSignedIn, onAuthenticated]);

  return (
    <div className={`auth-screen${visible ? " auth-screen--visible" : ""}`}>
      <div className="auth-screen__glow" aria-hidden />
      <div className="auth-screen__content">
        <p className="auth-screen__eyebrow">TurnUp</p>
        <h1 className="auth-screen__title">Create your account</h1>
        <p className="auth-screen__sub">
          Save events, post flyers, and connect with your campus — all in one place.
        </p>

        <div className="auth-screen__actions">
          <SignUpButton mode="modal" appearance={turnUpClerkAppearance}>
            <button type="button" className="auth-screen__cta">
              Sign up
            </button>
          </SignUpButton>
          <SignInButton mode="modal" appearance={turnUpClerkAppearance}>
            <button type="button" className="auth-screen__secondary">
              Already have an account? Sign in
            </button>
          </SignInButton>
        </div>
      </div>
    </div>
  );
}
