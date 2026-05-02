"use client";

import { useState, type MouseEvent } from "react";

const EVENTS = [
  { id: 1, title: "Rooftop Jazz & Wine Night", tag: "Music", date: "Fri May 9 · 8pm", color: "#1a1230", accent: "#9b72cf", tall: true },
  { id: 2, title: "Campus Art Showcase", tag: "Art", date: "Sat May 10 · 2pm", color: "#0d1f14", accent: "#4ade80", tall: true },
  { id: 3, title: "Friday Night Run Club", tag: "Fitness", date: "Fri May 9 · 6am", color: "#1a0e0e", accent: "#f87171", tall: false },
  { id: 4, title: "Hackathon 2025", tag: "Tech", date: "May 11–12", color: "#0d1520", accent: "#60a5fa", tall: false },
  { id: 5, title: "Open Mic Night", tag: "Performance", date: "Thu May 8 · 7pm", color: "#1a1500", accent: "#fbbf24", tall: true },
  { id: 6, title: "Paint & Sip Social", tag: "Art", date: "Sun May 11 · 4pm", color: "#0f0d1a", accent: "#c084fc", tall: false },
  { id: 7, title: "Startup Mixer", tag: "Networking", date: "Wed May 14 · 6pm", color: "#0d1a1a", accent: "#2dd4bf", tall: false },
  { id: 8, title: "Block Party BBQ", tag: "Social", date: "Sat May 17 · 1pm", color: "#1a0f05", accent: "#fb923c", tall: true },
];

function GoogleCalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="white" strokeWidth="1.8" />
      <path d="M3 9h18" stroke="white" strokeWidth="1.8" />
      <path d="M8 2v4M16 2v4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden>
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

function EventCard({ event, onDots }: { event: (typeof EVENTS)[0]; onDots: (e: MouseEvent) => void }) {
  const cls = event.tall ? "event-card card-tall" : "event-card card-short";
  return (
    <div className={cls}>
      <div className="card-image">
        <div
          className="card-image-placeholder"
          style={{
            background: `linear-gradient(135deg, ${event.color} 0%, ${event.accent}22 100%)`,
            height: event.tall ? 180 : 120,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: `${event.accent}33`,
              border: `1px solid ${event.accent}44`,
            }}
          />
        </div>
        <button
          type="button"
          className="card-dots-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDots(e);
          }}
        >
          <DotsIcon />
        </button>
      </div>
      <div className="card-body">
        <span className="card-tag">{event.tag}</span>
        <div className="card-title">{event.title}</div>
        <div className="card-date">{event.date}</div>
        <button type="button" className="card-action">
          <GoogleCalIcon /> Add to Google Calendar
        </button>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 });

  const openCtx = (e: MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frame = document.querySelector(".mobile-frame");
    const frameRect = frame?.getBoundingClientRect();
    if (!frameRect) return;
    setCtxPos({ x: rect.left - frameRect.left - 120, y: rect.bottom - frameRect.top + 4 });
    setCtxOpen(true);
  };

  const closeCtx = () => setCtxOpen(false);

  const leftCol = EVENTS.filter((_, i) => i % 2 === 0);
  const rightCol = EVENTS.filter((_, i) => i % 2 === 1);

  return (
    <div className="browse-page">
      <div className="browse-header">
        <div className="browse-title">
          Find your world in
          <br />
          <span>
            New York
            <svg className="city-caret" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M4 6l4 4 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
        <div className="browse-filters">
          <button type="button" className="filter-pill">
            Date
          </button>
          <button type="button" className="filter-pill">
            Price
          </button>
          <div className="filter-spacer" />
          <button type="button" className="search-btn" aria-label="Search">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="10.5" cy="10.5" r="6.5" stroke="white" strokeWidth="1.8" />
              <path d="M15.5 15.5L20 20" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="masonry-scroll">
        <div className="masonry-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {leftCol.map((ev) => (
              <EventCard key={ev.id} event={ev} onDots={openCtx} />
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 28 }}>
            {rightCol.map((ev) => (
              <EventCard key={ev.id} event={ev} onDots={openCtx} />
            ))}
          </div>
        </div>
      </div>

      <div className={`ctx-overlay${ctxOpen ? " open" : ""}`} onClick={closeCtx}>
        <div
          className={`ctx-menu${ctxOpen ? " open" : ""}`}
          style={{ left: Math.max(8, ctxPos.x), top: ctxPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="ctx-item" onClick={closeCtx}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                stroke="white"
                strokeWidth="1.6"
              />
            </svg>
            Save event
          </button>
          <button type="button" className="ctx-item" onClick={closeCtx}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Share
          </button>
          <button type="button" className="ctx-item destructive" onClick={closeCtx}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="10" stroke="#ff4444" strokeWidth="1.6" />
              <path d="M9 9l6 6M15 9l-6 6" stroke="#ff4444" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Recommend less
          </button>
        </div>
      </div>
    </div>
  );
}
