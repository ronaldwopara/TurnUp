import type { Metadata } from "next";
import AnalyticsPage from "@/components/analytics/AnalyticsPage";
import "../analytics.css";

export const metadata: Metadata = {
  title: "TurnUp — Analytics",
};

export default function AnalyticsRoute() {
  return (
    <div className="mobile-frame">
      <AnalyticsPage />
    </div>
  );
}
