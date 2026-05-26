"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type WheelEvent } from "react";
import { isEventLiked, toggleLikedEvent } from "@/lib/discoveries-store";
import type { EventItem } from "@/lib/browse-data";

const HORIZONTAL_SWIPE_THRESHOLD = 72;
const VERTICAL_NAV_THRESHOLD = 64;
const DIRECTION_LOCK_THRESHOLD = 12;
const WHEEL_THRESHOLD = 22;
const ANIMATION_DURATION_MS = 320;
const CARD_TRANSITION = { type: "spring", damping: 25, stiffness: 300 } as const;

type GestureLock = "horizontal" | "vertical" | null;
type TransitionIntent = { axis: "x" | "y"; direction: 1 | -1 };

const CARD_VARIANTS = {
  enter: (intent: TransitionIntent) =>
    intent.axis === "y"
      ? { y: intent.direction === 1 ? 88 : -88, opacity: 0, scale: 0.985 }
      : { opacity: 1, scale: 0.985 },
  center: {
    x: 0,
    y: 0,
    opacity: 1,
    scale: 1,
    rotate: 0,
  },
  exit: (intent: TransitionIntent) =>
    intent.axis === "y"
      ? { y: intent.direction === 1 ? -92 : 92, opacity: 0, scale: 0.985 }
      : {
          x: intent.direction === 1 ? 220 : -220,
          opacity: 0,
          scale: 0.98,
          rotate: intent.direction === 1 ? 12 : -12,
        },
};

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
  dragOffsetX: number;
};

function DeckCard({ event, onDots, dragOffsetX }: DeckCardProps) {
  const [liked, setLiked] = useState(() => isEventLiked(event.id));

  const handleHeartClick = (e: MouseEvent) => {
    e.stopPropagation();
    const newState = toggleLikedEvent(event.id);
    setLiked(newState);
  };

  const swipeLabelOpacity = Math.min(1, Math.abs(dragOffsetX) / HORIZONTAL_SWIPE_THRESHOLD);
  const showCalendarLabel = dragOffsetX > 20;
  const showSkipLabel = dragOffsetX < -20;

  return (
    <div className="deck-card">
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
  const [gestureLock, setGestureLock] = useState<GestureLock>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [transitionIntent, setTransitionIntent] = useState<TransitionIntent>({ axis: "y", direction: 1 });

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  const wheelCooldownRef = useRef(0);
  const eventFingerprint = useMemo(() => events.map((event) => event.id).join("\0"), [events]);

  const currentEvent = events[currentIndex];

  useEffect(() => {
    setCurrentIndex(0);
    setDragOffset({ x: 0, y: 0 });
    setGestureLock(null);
    setIsAnimating(false);
  }, [eventFingerprint]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current != null) {
        window.clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const finishAnimationLater = useCallback(() => {
    if (animationTimeoutRef.current != null) {
      window.clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = window.setTimeout(() => {
      setIsAnimating(false);
    }, ANIMATION_DURATION_MS);
  }, []);

  const goNext = useCallback((intent: TransitionIntent, openCalendar = false) => {
    if (isAnimating) return;
    if (currentIndex >= events.length) return;

    setIsAnimating(true);
    setTransitionIntent(intent);
    setGestureLock(null);
    setDragOffset({ x: 0, y: 0 });

    if (openCalendar && currentEvent) {
      const calendarUrl = buildSimpleCalendarUrl(currentEvent);
      window.open(calendarUrl, "_blank", "noopener,noreferrer");
    }

    setCurrentIndex((prev) => Math.min(events.length, prev + 1));
    finishAnimationLater();
  }, [currentEvent, currentIndex, events.length, finishAnimationLater, isAnimating]);

  const goPrevious = useCallback(() => {
    if (isAnimating || currentIndex <= 0) return;
    setIsAnimating(true);
    setTransitionIntent({ axis: "y", direction: -1 });
    setGestureLock(null);
    setDragOffset({ x: 0, y: 0 });
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    finishAnimationLater();
  }, [currentIndex, finishAnimationLater, isAnimating]);

  const resetDeck = () => {
    setCurrentIndex(0);
    setDragOffset({ x: 0, y: 0 });
    setGestureLock(null);
    setTransitionIntent({ axis: "y", direction: 1 });
    setIsAnimating(false);
  };

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (isAnimating) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setGestureLock(null);
    setDragOffset({ x: 0, y: 0 });
  }, [isAnimating]);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    if (gestureLock == null) {
      if (Math.abs(dx) > Math.abs(dy) + DIRECTION_LOCK_THRESHOLD) {
        setGestureLock("horizontal");
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragOffset({ x: dx, y: 0 });
        return;
      } else if (Math.abs(dy) > Math.abs(dx) + DIRECTION_LOCK_THRESHOLD) {
        setGestureLock("vertical");
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragOffset({ x: 0, y: dy });
        return;
      } else {
        return;
      }
    }

    if (gestureLock === "horizontal") {
      setDragOffset({ x: dx, y: 0 });
    } else if (gestureLock === "vertical") {
      setDragOffset({ x: 0, y: dy });
    }
  }, [gestureLock]);

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
    const dy = e.clientY - start.y;

    if (gestureLock === "horizontal") {
      if (dx > HORIZONTAL_SWIPE_THRESHOLD) {
        goNext({ axis: "x", direction: 1 }, true);
      } else if (dx < -HORIZONTAL_SWIPE_THRESHOLD) {
        goNext({ axis: "x", direction: -1 });
      } else {
        setDragOffset({ x: 0, y: 0 });
      }
    } else if (gestureLock === "vertical") {
      if (dy <= -VERTICAL_NAV_THRESHOLD) {
        goNext({ axis: "y", direction: 1 });
      } else if (dy >= VERTICAL_NAV_THRESHOLD) {
        goPrevious();
      } else {
        setDragOffset({ x: 0, y: 0 });
      }
    }

    setGestureLock(null);
  }, [gestureLock, goNext, goPrevious]);

  const onPointerCancel = useCallback((e: PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = null;
    setGestureLock(null);
    setDragOffset({ x: 0, y: 0 });
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
    const now = Date.now();
    if (isAnimating || now < wheelCooldownRef.current) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    wheelCooldownRef.current = now + ANIMATION_DURATION_MS;
    if (e.deltaY > 0) {
      goNext({ axis: "y", direction: 1 });
    } else {
      goPrevious();
    }
  }, [goNext, goPrevious, isAnimating]);

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
        onWheel={onWheel}
        style={{ touchAction: "none" }}
      >
        <AnimatePresence custom={transitionIntent} initial={false} mode="wait">
          <motion.div
            key={currentEvent.id}
            className="deck-card-motion"
            custom={transitionIntent}
            variants={CARD_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={CARD_TRANSITION}
            style={{
              x: gestureLock === "horizontal" ? dragOffset.x : 0,
              y: gestureLock === "vertical" ? dragOffset.y * 0.3 : 0,
              rotate: gestureLock === "horizontal" ? Math.max(-15, Math.min(15, dragOffset.x * 0.05)) : 0,
            }}
          >
            <DeckCard
              event={currentEvent}
              onDots={onDots}
              dragOffsetX={gestureLock === "horizontal" ? dragOffset.x : 0}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
