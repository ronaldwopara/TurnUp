import type { Metadata } from "next";
import SearchPage from "@/components/browse/SearchPage";
import "../../search.css";

export const metadata: Metadata = {
  title: "TurnUp — Search",
};

export default function BrowseSearchRoute() {
  return (
    <div className="mobile-frame">
      <SearchPage />
    </div>
  );
}
