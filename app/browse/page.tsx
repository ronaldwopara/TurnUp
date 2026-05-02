import type { Metadata } from "next";
import BrowsePage from "@/components/browse/BrowsePage";
import "../browse.css";

export const metadata: Metadata = {
  title: "TurnUp — Browse Events",
};

export default function BrowseRoute() {
  return (
    <div className="mobile-frame">
      <BrowsePage />
    </div>
  );
}
