import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TurnUp — Your Interests",
};

export default function InterestsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
