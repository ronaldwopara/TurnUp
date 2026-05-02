"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FeaturedEvent = {
  id: string;
  title: string;
  when: string;
  organizer: string;
  thumbColor: string;
  thumbAccent: string;
};

const FEATURED_EVENTS: FeaturedEvent[] = [
  {
    id: "1",
    title: "MATRODA / Trivecta @ Cuban Club",
    when: "Today",
    organizer: "Pied Piper Productions",
    thumbColor: "#2a1810",
    thumbAccent: "#e85d04",
  },
  {
    id: "2",
    title: "LEON THOMAS X DRUNK N LOVE R&B PARTY",
    when: "Tonight",
    organizer: "HighStatus Ent",
    thumbColor: "#1a1528",
    thumbAccent: "#a78bfa",
  },
  {
    id: "3",
    title: "CROWNED IN GOLD",
    when: "Tomorrow",
    organizer: "Walls Productions",
    thumbColor: "#1a1208",
    thumbAccent: "#fbbf24",
  },
  {
    id: "4",
    title: "FRNDS Only: Miami F1 Weekend",
    when: "Tomorrow",
    organizer: "FRNDS Only",
    thumbColor: "#0d1f14",
    thumbAccent: "#34d399",
  },
  {
    id: "5",
    title: "Reggaeton Rave → Brooklyn, NY",
    when: "Tomorrow",
    organizer: "reggaetonLABS",
    thumbColor: "#1a0a12",
    thumbAccent: "#fb7185",
  },
  {
    id: "6",
    title: "SOL At 1 Hotel: Season Opener w/ Massuma",
    when: "Sunday",
    organizer: "Sol Together",
    thumbColor: "#0f172a",
    thumbAccent: "#38bdf8",
  },
];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FEATURED_EVENTS;
    return FEATURED_EVENTS.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.organizer.toLowerCase().includes(q) ||
        e.when.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="search-page">
      <header className="search-top">
        <button type="button" className="search-back" onClick={() => router.push("/browse")} aria-label="Back to browse">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="search-title">Search</h1>
      </header>

      <div className="search-field-wrap">
        <div className="search-field">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="10.5" cy="10.5" r="6.5" stroke="white" strokeWidth="1.8" />
            <path d="M15.5 15.5L20 20" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            className="search-input"
            placeholder="Search events, organizations, people.."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            autoFocus
            enterKeyHint="search"
          />
        </div>
      </div>

      <div className="search-body">
        <p className="search-section-label">Featured Events</p>
        {filtered.length === 0 ? (
          <p className="search-empty-hint">No matches — try another search.</p>
        ) : (
          <div className="search-results-list">
            {filtered.map((ev) => (
              <button key={ev.id} type="button" className="search-result-row">
                <div className="search-result-thumb">
                  <div
                    className="search-result-thumb-inner"
                    style={{
                      background: `linear-gradient(135deg, ${ev.thumbColor} 0%, ${ev.thumbAccent}33 100%)`,
                    }}
                    aria-hidden
                  />
                </div>
                <div className="search-result-text">
                  <span className="search-result-title">{ev.title}</span>
                  <span className="search-result-meta">
                    {ev.when} · {ev.organizer}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
