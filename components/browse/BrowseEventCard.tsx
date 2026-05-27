"use client";

import { useState, type MouseEvent } from "react";

import { AddToCalendarButton } from "@/components/ui/AddToCalendarButton";
import { EventPosterImage } from "@/components/browse/EventPosterImage";
import { layoutIdForBrowseEvent, buildCalendarUrlForEvent, eventItemToDetail } from "@/lib/browse-event-detail";
import type { EventItem } from "@/lib/browse-data";
import { isEventLiked, toggleLikedEvent } from "@/lib/discoveries-store";

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden>
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "#ef4444" : "none"} aria-hidden>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        stroke={filled ? "#ef4444" : "white"}
        strokeWidth="1.8"
      />
    </svg>
  );
}

function formatEventCardPrice(usd: number): string {
  if (usd === 0) return "Free";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(usd);
}

export type BrowseEventCardProps = {
  event: EventItem;
  onDots: (e: MouseEvent) => void;
  onSelect: (event: EventItem) => void;
  layout?: "grid" | "strip";
};

export function BrowseEventCard({ event, onDots, onSelect, layout = "grid" }: BrowseEventCardProps) {
  const [liked, setLiked] = useState(() => isEventLiked(event.id));
  const detailId = eventItemToDetail(event).id;
  const layoutId = layoutIdForBrowseEvent(detailId);

  const handleHeartClick = (e: MouseEvent) => {
    e.stopPropagation();
    setLiked(toggleLikedEvent(event.id));
  };

  const cls = [
    event.tall ? "event-card card-tall" : "event-card card-short",
    layout === "strip" ? "event-card--strip" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(event)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(event);
        }
      }}
    >
      <div className="card-image">
        <EventPosterImage
          imageUrl={event.imageUrl}
          color={event.color}
          accent={event.accent}
          layoutId={layoutId}
        />
        <button
          type="button"
          className="card-dots-btn card-glass-btn"
          aria-label="More options"
          onClick={(e) => {
            e.stopPropagation();
            onDots(e);
          }}
        >
          <DotsIcon />
        </button>
        <button
          type="button"
          className="card-heart-btn card-glass-btn"
          aria-label={liked ? "Unlike" : "Like"}
          aria-pressed={liked}
          onClick={handleHeartClick}
        >
          <HeartIcon filled={liked} />
        </button>
        <AddToCalendarButton
          className="card-cal-floating card-glass-btn"
          stopPropagation
          onClick={() => window.open(buildCalendarUrlForEvent(event), "_blank", "noopener,noreferrer")}
        />
      </div>
      <div className="card-body">
        <h3 className="card-title">{event.title}</h3>
        <div className="card-description">
          <span className="card-price">{formatEventCardPrice(event.priceUsd)}</span>
          <span className="card-description-dot" aria-hidden>
            ·
          </span>
          <span className="card-date">{event.date}</span>
        </div>
      </div>
    </div>
  );
}
