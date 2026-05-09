"use client";

import { useMemo } from "react";

type DataPoint = {
  time: string;
  value: number;
};

type MetricChartProps = {
  data: DataPoint[];
  width?: number;
  height?: number;
  dotColor?: string;
  lineColor?: string;
};

export function MetricChart({
  data,
  width = 320,
  height = 140,
  dotColor = "#93c5fd",
  lineColor = "#93c5fd",
}: MetricChartProps) {
  const { points, yLabels, maxY } = useMemo(() => {
    if (data.length === 0) {
      return { points: [], yLabels: [], maxY: 0 };
    }

    const values = data.map((d) => d.value);
    const max = Math.max(...values, 1);
    const min = 0;

    const paddingLeft = 40;
    const paddingRight = 16;
    const paddingTop = 16;
    const paddingBottom = 28;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const pts = data.map((d, i) => {
      const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * chartWidth;
      const y = paddingTop + (1 - (d.value - min) / (max - min || 1)) * chartHeight;
      return { x, y, value: d.value, time: d.time };
    });

    const niceMax = Math.ceil(max / 1000) * 1000 || max;
    const labelCount = 4;
    const labels = Array.from({ length: labelCount }, (_, i) => {
      const val = (niceMax / (labelCount - 1)) * (labelCount - 1 - i);
      const y = paddingTop + (i / (labelCount - 1)) * chartHeight;
      return { val, y };
    });

    return { points: pts, yLabels: labels, maxY: niceMax };
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <svg width={width} height={height} className="metric-chart">
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={14}>
          No data yet
        </text>
      </svg>
    );
  }

  const paddingLeft = 40;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 28;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const formatLabel = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val.toFixed(0);
  };

  const firstTime = data[0]?.time ?? "";
  const lastTime = data[data.length - 1]?.time ?? "";

  const formatTimeLabel = (iso: string) => {
    if (!iso) return "";
    const date = new Date(iso + ":00:00Z");
    const now = new Date();
    const diffHours = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours <= 1) return "Now";
    return `-${diffHours}h`;
  };

  return (
    <svg width={width} height={height} className="metric-chart">
      {yLabels.map((label, i) => (
        <g key={i}>
          <line
            x1={paddingLeft}
            y1={label.y}
            x2={width - paddingRight}
            y2={label.y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
          <text
            x={paddingLeft - 8}
            y={label.y + 4}
            textAnchor="end"
            fill="rgba(255,255,255,0.4)"
            fontSize={11}
          >
            {formatLabel(label.val)}
          </text>
        </g>
      ))}

      <path
        d={pathD}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.6}
      />

      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill={dotColor}
        />
      ))}

      <text
        x={paddingLeft}
        y={height - 6}
        textAnchor="start"
        fill="rgba(255,255,255,0.4)"
        fontSize={11}
      >
        {formatTimeLabel(firstTime)}
      </text>
      <text
        x={width - paddingRight}
        y={height - 6}
        textAnchor="end"
        fill="rgba(255,255,255,0.4)"
        fontSize={11}
      >
        Now
      </text>
    </svg>
  );
}
