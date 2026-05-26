"use client";

import { useCallback, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { isEventLiked, toggleLikedEvent } from "@/lib/discoveries-store";
import type { EventItem } from "@/lib/browse-data";

const SWIPE_THRESHOLD = 72;
const DIRECTION_LOCK_THRESHOLD = 12;

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

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="white" strokeWidth="1.8" />
      <path d="M3 9h18" stroke="white" strokeWidth="1.8" />
      <path d="M8 2v4M16 2v4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function formatEventCardPrice(usd: number): string {
  if (usd === 0) return "Free";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(usd);
}

function buildSimpleCalendarUrl(event: EventItem): string {
  const title = encodeURIComponent(event.title);
  const eventDate = event.eventDate;
  const year = eventDate.getFullYear();
  const month = String(eventDate.getMonth() + 1).padStart(2, "0");
  const day = String(eventDate.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;
  const nextDay = new Date(eventDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextYear = nextDay.getFullYear();
  const nextMonth = String(nextDay.getMonth() + 1).padStart(2, "0");
  const nextDayStr = String(nextDay.getDate()).padStart(2, "0");
  const endDateStr = `${nextYear}${nextMonth}${nextDayStr}`;
  return `https://calendar.google.com/calendar/u/0/r/eventedit?text=${title}&dates=${dateStr}/${endDateStr}`;
}

type DeckCardProps = {
  event: EventItem;
  onDots: (e: MouseEvent) => void;
  dragOffset: { x: number; y: number };
  isDragging: boolean;
  exitDirection: "left" | "right" | null;
};

function DeckCard({ event, onDots, dragOffset, isDragging, exitDirection }: DeckCardProps) {
  const [liked, setLiked] = useState(() => isEventLiked(event.id));

  const handleHeartClick = (e: MouseEvent) => {
    e.stopPropagation();
    const newState = toggleLikedEvent(event.id);
    setLiked(newState);
  };

  const rotation = isDragging ? dragOffset.x * 0.05 : 0;
  const clampedRotation = Math.max(-15, Math.min(15, rotation));

  let cardClassName = "deck-card";
  if (isDragging) cardClassName += " deck-card-dragging";
  if (exitDirection === "right") cardClassName += " deck-card-exit-right";
  if (exitDirection === "left") cardClassName += " deck-card-exit-left";

  const swipeLabelOpacity = Math.min(1, Math.abs(dragOffset.x) / SWIPE_THRESHOLD);
  const showCalendarLabel = dragOffset.x > 20;
  const showSkipLabel = dragOffset.x < -20;

  return (
    <div
      className={cardClassName}
      style={{
        transform: isDragging
          ? `translateX(${dragOffset.x}px) rotate(${clampedRotation}deg)`
          : undefined,
      }}
    >
      <div className="deck-card-image">
        <div
          className="deck-card-image-placeholder"
          style={{
            background: `linear-gradient(135deg, ${event.color} 0%, ${event.accent}44 100%)`,
          }}
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
        {showCalendarLabel && (
          <div
            className="deck-swipe-label deck-swipe-label--right"
            style={{ opacity: swipeLabelOpacity }}
          >
            <CalendarIcon />
            <span>Add to Calendar</span>
          </div>
        )}
        {showSkipLabel && (
          <div
            className="deck-swipe-label deck-swipe-label--left"
            style={{ opacity: swipeLabelOpacity }}
          >
            <SkipIcon />
            <span>Skip</span>
          </div>
        )}
      </div>
      <div className="deck-card-body">
        <div className="deck-card-tag">{event.tag}</div>
        <h3 className="deck-card-title">{event.title}</h3>
        <div className="deck-card-meta">
          <span className="deck-card-price">{formatEventCardPrice(event.priceUsd)}</span>
          <span className="deck-card-dot" aria-hidden>·</span>
          <span className="deck-card-date">{event.date}</span>
        </div>
        {event.amenities.length > 0 && (
          <div className="deck-card-amenities">
            {event.amenities.map((a) => (
              <span key={a} className="deck-card-amenity">{a}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type BrowseDeckViewProps = {
  events: EventItem[];
  onDots: (e: MouseEvent) => void;
};

export function BrowseDeckView({ events, onDots }: BrowseDeckViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
  const [isHorizontalLocked, setIsHorizontalLocked] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasLockedRef = useRef(false);

  const currentEvent = events[currentIndex];

  const advanceCard = useCallback((direction: "left" | "right") => {
    setExitDirection(direction);

    if (direction === "right" && currentEvent) {
      const calendarUrl = buildSimpleCalendarUrl(currentEvent);
      window.open(calendarUrl, "_blank", "noopener,noreferrer");
    }

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setExitDirection(null);
      setDragOffset({ x: 0, y: 0 });
    }, 300);
  }, [currentEvent]);

  const resetDeck = () => {
    setCurrentIndex(0);
    setDragOffset({ x: 0, y: 0 });
    setExitDirection(null);
  };

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (exitDirection) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    hasLockedRef.current = false;
    setIsHorizontalLocked(false);
    setIsDragging(false);
  }, [exitDirection]);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    if (!hasLockedRef.current) {
      if (Math.abs(dx) > Math.abs(dy) + DIRECTION_LOCK_THRESHOLD) {
        hasLockedRef.current = true;
        setIsHorizontalLocked(true);
        setIsDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      } else if (Math.abs(dy) > Math.abs(dx)) {
        dragStartRef.current = null;
        return;
      }
    }

    if (isHorizontalLocked || hasLockedRef.current) {
      setDragOffset({ x: dx, y: 0 });
    }
  }, [isHorizontalLocked]);

  const onPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;

    if (!start) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const dx = e.clientX - start.x;

    if (hasLockedRef.current) {
      if (dx > SWIPE_THRESHOLD) {
        advanceCard("right");
      } else if (dx < -SWIPE_THRESHOLD) {
        advanceCard("left");
      } else {
        setDragOffset({ x: 0, y: 0 });
      }
    }

    setIsDragging(false);
    setIsHorizontalLocked(false);
    hasLockedRef.current = false;
  }, [advanceCard]);

  const onPointerCancel = useCallback((e: PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = null;
    setIsDragging(false);
    setIsHorizontalLocked(false);
    hasLockedRef.current = false;
    setDragOffset({ x: 0, y: 0 });
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  if (events.length === 0) {
    return (
      <div className="deck-view">
        <div className="deck-empty">
          <p className="deck-empty-title">No events match your filters</p>
          <p className="deck-empty-desc">Try adjusting your filters to see more events.</p>
        </div>
      </div>
    );
  }

  if (currentIndex >= events.length) {
    return (
      <div className="deck-view">
        <div className="deck-empty">
          <p className="deck-empty-title">You&apos;ve seen everything!</p>
          <p className="deck-empty-desc">Check back later for new events or reset to browse again.</p>
          <button type="button" className="deck-reset-btn" onClick={resetDeck}>
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="deck-view">
      <div
        className="deck-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{ touchAction: "pan-y" }}
      >
        <DeckCard
          key={currentEvent.id}
          event={currentEvent}
          onDots={onDots}
          dragOffset={dragOffset}
          isDragging={isDragging}
          exitDirection={exitDirection}
        />
      </div>
      <div className="deck-progress">
        {currentIndex + 1} / {events.length}
      </div>
      <div className="deck-hint">
        <span className="deck-hint-left">← Skip</span>
        <span className="deck-hint-right">Calendar →</span>
      </div>
    </div>
  );
}
