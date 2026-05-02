import type { Metadata } from "next";
import { Suspense } from "react";
import SplashApp from "@/components/splash/SplashApp";
import "./splash.css";

export const metadata: Metadata = {
  title: "TurnUp",
};

export default function Home() {
  return (
    <Suspense fallback={<div className="mobile-frame" style={{ background: "#000", minHeight: "100vh" }} />}>
      <SplashApp />
    </Suspense>
  );
}
