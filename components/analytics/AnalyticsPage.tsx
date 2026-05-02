"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MetricChart } from "./MetricChart";
import { getUserProfile, getUserId } from "@/lib/discoveries-store";

type FlyerAnalytics = {
  flyerId: string;
  title: string;
  totals: {
    impressions: number;
    saves: number;
    clicks: number;
  };
  timeSeries: Array<{
    time: string;
    impressions: number;
    saves: number;
    clicks: number;
  }>;
  uniqueActors: number;
  viewToSaveRate: number;
  engagementRate: number;
};

type AggregateData = {
  flyers: FlyerAnalytics[];
  aggregate: {
    totals: {
      impressions: number;
      saves: number;
      clicks: number;
    };
    uniqueActors: number;
    viewToSaveRate: number;
    engagementRate: number;
  };
};

type MetricType = "impressions" | "saves" | "clicks" | "engagements";

const METRIC_LABELS: Record<MetricType, { title: string; subtitle: string }> = {
  impressions: {
    title: "Impressions",
    subtitle: "The number of times your flyers were on screen",
  },
  saves: {
    title: "Saves",
    subtitle: "Users who saved your flyer to their collection",
  },
  clicks: {
    title: "Clicks",
    subtitle: "Users who tapped to view your flyer details",
  },
  engagements: {
    title: "Engagements",
    subtitle: "Total interactions (saves + clicks)",
  },
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AggregateData | null>(null);
  const [selectedFlyer, setSelectedFlyer] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("impressions");

  const profile = getUserProfile();
  const userId = getUserId();
  const isOrganiser = profile?.role === "organiser";

  useEffect(() => {
    if (!isOrganiser) {
      router.push("/browse");
      return;
    }

    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/flyers/analytics?userId=${encodeURIComponent(userId)}&hours=24`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load");
        const payload = (await res.json()) as { data?: AggregateData };
        if (payload.data) {
          setData(payload.data);
        }
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    void loadAnalytics();
    const t = setInterval(loadAnalytics, 15000);
    return () => clearInterval(t);
  }, [isOrganiser, userId, router]);

  if (!isOrganiser) {
    return null;
  }

  const currentFlyer = selectedFlyer
    ? data?.flyers.find((f) => f.flyerId === selectedFlyer)
    : null;

  const displayData = currentFlyer ?? {
    totals: data?.aggregate.totals ?? { impressions: 0, saves: 0, clicks: 0 },
    timeSeries: [] as FlyerAnalytics["timeSeries"],
    uniqueActors: data?.aggregate.uniqueActors ?? 0,
    viewToSaveRate: data?.aggregate.viewToSaveRate ?? 0,
    engagementRate: data?.aggregate.engagementRate ?? 0,
  };

  const aggregatedTimeSeries = !currentFlyer && data?.flyers
    ? data.flyers.reduce<Record<string, { impressions: number; saves: number; clicks: number }>>((acc, flyer) => {
        flyer.timeSeries.forEach((ts) => {
          if (!acc[ts.time]) {
            acc[ts.time] = { impressions: 0, saves: 0, clicks: 0 };
          }
          acc[ts.time].impressions += ts.impressions;
          acc[ts.time].saves += ts.saves;
          acc[ts.time].clicks += ts.clicks;
        });
        return acc;
      }, {})
    : null;

  const chartTimeSeries = currentFlyer?.timeSeries ?? (
    aggregatedTimeSeries
      ? Object.entries(aggregatedTimeSeries)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([time, counts]) => ({ time, ...counts }))
      : []
  );

  const getMetricValue = (metric: MetricType) => {
    const totals = displayData.totals;
    switch (metric) {
      case "impressions":
        return totals.impressions;
      case "saves":
        return totals.saves;
      case "clicks":
        return totals.clicks;
      case "engagements":
        return totals.saves + totals.clicks;
    }
  };

  const getChartData = (metric: MetricType) => {
    return chartTimeSeries.map((ts) => ({
      time: ts.time,
      value:
        metric === "engagements"
          ? ts.saves + ts.clicks
          : ts[metric as keyof Omit<typeof ts, "time">] as number,
    }));
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toLocaleString();
  };

  const formatPercent = (n: number) => `${n.toFixed(1)}%`;

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <button type="button" className="analytics-back" onClick={() => router.push("/profile")}>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden>
            <path d="M7 1L1 7l6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="analytics-title">Analytics</h1>
      </header>

      {loading ? (
        <div className="analytics-loading">Loading...</div>
      ) : (
        <>
          <div className="analytics-flyer-pills">
            <button
              type="button"
              className={`analytics-pill${!selectedFlyer ? " active" : ""}`}
              onClick={() => setSelectedFlyer(null)}
            >
              All Flyers
            </button>
            {data?.flyers.map((f) => (
              <button
                key={f.flyerId}
                type="button"
                className={`analytics-pill${selectedFlyer === f.flyerId ? " active" : ""}`}
                onClick={() => setSelectedFlyer(f.flyerId)}
              >
                {f.title.slice(0, 20)}{f.title.length > 20 ? "..." : ""}
              </button>
            ))}
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-header">
              <h2 className="analytics-metric-name">{METRIC_LABELS[selectedMetric].title}</h2>
              <p className="analytics-metric-subtitle">{METRIC_LABELS[selectedMetric].subtitle}</p>
            </div>
            <div className="analytics-metric-value">{formatNumber(getMetricValue(selectedMetric))}</div>
            <div className="analytics-chart-wrap">
              <MetricChart
                data={getChartData(selectedMetric)}
                width={320}
                height={140}
              />
            </div>
            <div className="analytics-selectors">
              <div className="analytics-selector">
                <span className="analytics-selector-label">Metric</span>
                <select
                  className="analytics-dropdown"
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
                >
                  <option value="impressions">Impressions</option>
                  <option value="saves">Saves</option>
                  <option value="clicks">Clicks</option>
                  <option value="engagements">Engagements</option>
                </select>
              </div>
            </div>
          </div>

          <div className="analytics-kpi-grid">
            <div className="analytics-kpi">
              <span className="analytics-kpi-label">View-to-Save Rate</span>
              <span className="analytics-kpi-value">{formatPercent(displayData.viewToSaveRate)}</span>
            </div>
            <div className="analytics-kpi">
              <span className="analytics-kpi-label">Engagement Rate</span>
              <span className="analytics-kpi-value">{formatPercent(displayData.engagementRate)}</span>
            </div>
            <div className="analytics-kpi">
              <span className="analytics-kpi-label">Unique Reach</span>
              <span className="analytics-kpi-value">{formatNumber(displayData.uniqueActors)}</span>
            </div>
            <div className="analytics-kpi">
              <span className="analytics-kpi-label">Total Flyers</span>
              <span className="analytics-kpi-value">{data?.flyers.length ?? 0}</span>
            </div>
          </div>

          <p className="analytics-footer">Updated in real-time</p>
        </>
      )}
    </div>
  );
}
