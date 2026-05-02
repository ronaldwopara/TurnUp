import type { Metadata } from "next";
import SplashApp from "@/components/splash/SplashApp";
import "./splash.css";

export const metadata: Metadata = {
  title: "TurnUp",
};

export default function Home() {
  return <SplashApp />;
}
