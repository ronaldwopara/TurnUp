"use client";

import { startOfDay, startOfMonth } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";

import { Calendar } from "@/components/ui/calendar";
import { AddToCalendarButton } from "@/components/ui/AddToCalendarButton";
import {
  UNIVERSITIES,
  ONBOARDING_HOME_UNIVERSITY_ID,
  AMENITY_OPTIONS,
  BROWSE_OTHER_SECTIONS,
  PRICE_TIER_LABELS,
  PRICE_TIER_CAPS_USD,
  ALL_EVENTS,
  formatDateChipDisplay,
  eventMatchesAppliedDate,
  formatAmenitiesChip,
  eventMatchesAmenities,
  tierFromSliderPercent,
  sliderPercentForTier,
  upcomingSaturday,
  type AmenityId,
  type EventItem,
  type AppliedDateFilter,
  type University,
} from "@/lib/browse-data";
import { getUserProfile, isEventLiked, setUserProfile, toggleLikedEvent, getAiSchools, getUserId } from "@/lib/discoveries-store";

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
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(
    usd,
  );
}

function EventCard({
  event,
  onDots,
  layout = "grid",
}: {
  event: EventItem;
  onDots: (e: MouseEvent) => void;
  layout?: "grid" | "strip";
}) {
  const [liked, setLiked] = useState(() => isEventLiked(event.id));

  const handleHeartClick = (e: MouseEvent) => {
    e.stopPropagation();
    const newState = toggleLikedEvent(event.id);
    setLiked(newState);
  };

  const cls = [
    event.tall ? "event-card card-tall" : "event-card card-short",
    layout === "strip" ? "event-card--strip" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls}>
      <div className="card-image">
        <div
          className="card-image-placeholder"
          style={{
            background: `linear-gradient(135deg, ${event.color} 0%, ${event.accent}22 100%)`,
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
        <AddToCalendarButton
          className="card-cal-floating card-glass-btn"
          stopPropagation
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

export default function BrowsePage() {
  const router = useRouter();
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 });

  const [uniSheetOpen, setUniSheetOpen] = useState(false);
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>(() => {
    const profile = getUserProfile();
    return profile?.universityId || ONBOARDING_HOME_UNIVERSITY_ID;
  });
  const [availableUniversities, setAvailableUniversities] = useState(UNIVERSITIES);

  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(2026, 4, 1));
  /** Set only when user taps a day on the calendar — enables “Choose Date” */
  const [pendingDate, setPendingDate] = useState<Date | undefined>(undefined);
  const [activeQuick, setActiveQuick] = useState<"month" | "weekend" | "tonight" | null>(null);
  const [appliedDateFilter, setAppliedDateFilter] = useState<AppliedDateFilter | undefined>(undefined);

  const [priceSheetOpen, setPriceSheetOpen] = useState(false);
  /** 0–100 continuous slider; label tier derived while dragging */
  const [pendingPriceSlider, setPendingPriceSlider] = useState(100);
  /** Applied tier 0–4; undefined = price filter off */
  const [appliedPriceTier, setAppliedPriceTier] = useState<number | undefined>(undefined);

  const [amenitiesSheetOpen, setAmenitiesSheetOpen] = useState(false);
  const [pendingAmenities, setPendingAmenities] = useState<AmenityId[]>([]);
  const [appliedAmenities, setAppliedAmenities] = useState<AmenityId[]>([]);

  type CommunityFlyer = {
    id: string;
    title: string;
    description?: string;
    eventDate?: string;
    price?: string;
    imageUrl?: string;
    color: string;
    accent: string;
    createdAt: string;
    postedBy: string;
    impressions: number;
    saves: number;
    clicks: number;
  };
  const [communityFlyers, setCommunityFlyers] = useState<CommunityFlyer[]>([]);
  const trackedImpressions = useRef<Set<string>>(new Set());

  const pendingPriceTierLabel = PRICE_TIER_LABELS[tierFromSliderPercent(pendingPriceSlider)];

  const selectedUniversity = useMemo(() => {
    return availableUniversities.find((u) => u.id === selectedUniversityId) ?? availableUniversities[0];
  }, [availableUniversities, selectedUniversityId]);

  useEffect(() => {
    const profile = getUserProfile();
    if (!profile) return;

    const preferred = (profile.availableUniversityIds ?? [])
      .map((id) => UNIVERSITIES.find((u) => u.id === id))
      .filter((u): u is (typeof UNIVERSITIES)[number] => Boolean(u));
    const universities = preferred.length > 0 ? preferred : UNIVERSITIES;

    setAvailableUniversities(universities);
    const nextSelected =
      universities.find((u) => u.id === profile.universityId)?.id ??
      universities.find((u) => u.name === profile.university)?.id ??
      universities[0]?.id ??
      ONBOARDING_HOME_UNIVERSITY_ID;
    setSelectedUniversityId(nextSelected);
  }, []);

  const selectedUniversityAbbr = useMemo(() => {
    const profile = getUserProfile();
    if (profile?.universityId === selectedUniversityId && profile.universityAbbr) return profile.universityAbbr;
    return selectedUniversity.abbr;
  }, [selectedUniversityId, selectedUniversity.abbr]);

  const universitiesForPicker: University[] = useMemo(() => {
    const city = selectedUniversity.city;
    const nearby = UNIVERSITIES.filter((u) => u.city === city);
    const rest = UNIVERSITIES.filter((u) => u.city !== city);
    return [...nearby, ...rest];
  }, [selectedUniversity.city]);

  const universitiesForPickerFinal: University[] = useMemo(() => {
    const aiSchools = getAiSchools();
    if (aiSchools.length > 0) {
      // Only show location-relevant schools when AI schools exist
      return aiSchools.map((s) => ({ id: s.id, abbr: s.abbr, name: s.name, city: s.city }));
    }
    return universitiesForPicker;
  }, [universitiesForPicker]);

  // Keep Browse in sync with the latest onboarding/profile pick.
  // (The university can be set during onboarding before the user reaches /browse.)
  useEffect(() => {
    const syncFromProfile = () => {
      const profile = getUserProfile();
      if (profile?.universityId && profile.universityId !== selectedUniversityId) {
        setSelectedUniversityId(profile.universityId);
      }
    };

    // Sync on mount and whenever the sheet is opened.
    syncFromProfile();
    if (uniSheetOpen) syncFromProfile();

    // Lightweight periodic sync so navigation without reload stays correct.
    const t = window.setInterval(syncFromProfile, 1500);
    return () => window.clearInterval(t);
  }, [selectedUniversityId, uniSheetOpen]);

  // Load community flyers
  useEffect(() => {
    let cancelled = false;
    const loadFlyers = async () => {
      try {
        const res = await fetch("/api/flyers", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as { data?: CommunityFlyer[] };
        if (!cancelled && Array.isArray(payload.data)) {
          setCommunityFlyers(payload.data);
        }
      } catch {
        // ignore
      }
    };
    void loadFlyers();
    const t = window.setInterval(loadFlyers, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  const trackFlyerEvent = async (flyerId: string, action: "impression" | "save" | "click") => {
    try {
      await fetch(`/api/flyers/${flyerId}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, actorId: getUserId() }),
      });
    } catch {
      // ignore
    }
  };

  const filteredEvents = useMemo(() => {
    let list = ALL_EVENTS;
    if (appliedDateFilter) {
      list = list.filter((ev) => eventMatchesAppliedDate(ev, appliedDateFilter));
    }
    if (appliedPriceTier !== undefined && appliedPriceTier < 4) {
      const cap = PRICE_TIER_CAPS_USD[appliedPriceTier];
      list = list.filter((ev) => ev.priceUsd <= cap);
    }
    if (appliedAmenities.length > 0) {
      list = list.filter((ev) => eventMatchesAmenities(ev, appliedAmenities));
    }
    return list;
  }, [appliedDateFilter, appliedPriceTier, appliedAmenities]);

  const filteredTrending = useMemo(
    () => filteredEvents.filter((ev) => ev.browseRow === undefined),
    [filteredEvents],
  );

  const filteredOtherSections = useMemo(
    () =>
      BROWSE_OTHER_SECTIONS.map((section) => ({
        ...section,
        events: filteredEvents.filter((ev) => ev.browseRow === section.id),
      })).filter((s) => s.events.length > 0),
    [filteredEvents],
  );

  const leftCol = filteredTrending.filter((_, i) => i % 2 === 0);
  const rightCol = filteredTrending.filter((_, i) => i % 2 === 1);

  useEffect(() => {
    if (!uniSheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUniSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [uniSheetOpen]);

  useEffect(() => {
    if (!dateSheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDateSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dateSheetOpen]);

  useEffect(() => {
    if (!priceSheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPriceSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [priceSheetOpen]);

  useEffect(() => {
    if (!amenitiesSheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAmenitiesSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [amenitiesSheetOpen]);

  const openDateSheet = () => {
    setUniSheetOpen(false);
    setPriceSheetOpen(false);
    setAmenitiesSheetOpen(false);
    setPendingDate(undefined);

    if (!appliedDateFilter) {
      const now = new Date();
      setCalendarMonth(startOfMonth(now));
      setActiveQuick(null);
      setDateSheetOpen(true);
      return;
    }

    if (appliedDateFilter.mode === "day") {
      const day = startOfDay(appliedDateFilter.date);
      setCalendarMonth(startOfMonth(day));
      setPendingDate(day);
      setActiveQuick(null);
    } else if (appliedDateFilter.mode === "tonight") {
      const day = startOfDay(appliedDateFilter.date);
      setCalendarMonth(startOfMonth(day));
      setActiveQuick("tonight");
    } else if (appliedDateFilter.mode === "month") {
      setCalendarMonth(appliedDateFilter.monthStart);
      setActiveQuick("month");
    } else if (appliedDateFilter.mode === "weekend") {
      setCalendarMonth(startOfMonth(appliedDateFilter.saturday));
      setActiveQuick("weekend");
    }

    setDateSheetOpen(true);
  };

  const pickTonight = () => {
    const t = startOfDay(new Date());
    setAppliedDateFilter({ mode: "tonight", date: t });
    setCalendarMonth(startOfMonth(t));
    setPendingDate(undefined);
    setActiveQuick("tonight");
    setDateSheetOpen(false);
  };

  const pickWeekend = () => {
    const s = upcomingSaturday(new Date());
    setAppliedDateFilter({ mode: "weekend", saturday: s });
    setCalendarMonth(startOfMonth(s));
    setPendingDate(undefined);
    setActiveQuick("weekend");
    setDateSheetOpen(false);
  };

  const pickThisMonth = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    setAppliedDateFilter({ mode: "month", monthStart });
    setCalendarMonth(monthStart);
    setPendingDate(undefined);
    setActiveQuick("month");
    setDateSheetOpen(false);
  };

  const commitChooseDate = () => {
    if (pendingDate === undefined) return;
    setAppliedDateFilter({ mode: "day", date: startOfDay(pendingDate) });
    setDateSheetOpen(false);
  };

  const resetFilters = () => {
    setAppliedDateFilter(undefined);
    setAppliedPriceTier(undefined);
    setAppliedAmenities([]);
  };

  const openPriceSheet = () => {
    setUniSheetOpen(false);
    setDateSheetOpen(false);
    setAmenitiesSheetOpen(false);
    setPendingPriceSlider(
      appliedPriceTier !== undefined ? sliderPercentForTier(appliedPriceTier) : 100,
    );
    setPriceSheetOpen(true);
  };

  const applyPriceFilter = () => {
    setAppliedPriceTier(tierFromSliderPercent(pendingPriceSlider));
    setPriceSheetOpen(false);
  };

  const openAmenitiesSheet = () => {
    setUniSheetOpen(false);
    setDateSheetOpen(false);
    setPriceSheetOpen(false);
    setPendingAmenities([...appliedAmenities]);
    setAmenitiesSheetOpen(true);
  };

  const togglePendingAmenity = (id: AmenityId) => {
    setPendingAmenities((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const applyAmenitiesFilter = () => {
    setAppliedAmenities([...pendingAmenities]);
    setAmenitiesSheetOpen(false);
  };

  const openCtx = (e: MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frame = document.querySelector(".mobile-frame");
    const frameRect = frame?.getBoundingClientRect();
    if (!frameRect) return;
    setCtxPos({ x: rect.left - frameRect.left - 120, y: rect.bottom - frameRect.top + 4 });
    setCtxOpen(true);
  };

  const closeCtx = () => setCtxOpen(false);

  const sheetOverlayOpen = uniSheetOpen || dateSheetOpen || priceSheetOpen || amenitiesSheetOpen;

  const masonryScrollRef = useRef<HTMLDivElement>(null);
  const [stickyHeaderStrength, setStickyHeaderStrength] = useState(0);

  useEffect(() => {
    const el = masonryScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const y = el.scrollTop;
      const t = Math.min(1, Math.max(0, (y - 8) / 64));
      setStickyHeaderStrength(t);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const openUniFromCompact = () => {
    setDateSheetOpen(false);
    setPriceSheetOpen(false);
    setAmenitiesSheetOpen(false);
    setUniSheetOpen(true);
  };

  return (
    <div className="browse-page">
      <header
        className="browse-compact-header"
        style={
          {
            opacity: stickyHeaderStrength,
            transform: `translateY(${(1 - stickyHeaderStrength) * -10}px)`,
            pointerEvents: stickyHeaderStrength > 0.08 ? "auto" : "none",
          } as CSSProperties
        }
        aria-hidden={stickyHeaderStrength < 0.08}
      >
        <button
          type="button"
          className="browse-compact-header-trigger"
          aria-expanded={uniSheetOpen}
          aria-haspopup="dialog"
          onClick={openUniFromCompact}
        >
          <span className="browse-compact-brand">TurnUp</span>
          <span className="browse-compact-uni">{selectedUniversityAbbr}</span>
          <svg className="browse-compact-caret" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M4 6l4 4 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          className="browse-compact-camera"
          aria-label="Open camera"
          onClick={() => router.push("/camera")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      <div className="masonry-scroll" ref={masonryScrollRef}>
        <div className="browse-header">
          <div className="browse-header-title-row">
            <div className="browse-title">
              Find your tribe in
              <br />
              <button
                type="button"
                className="browse-location-trigger"
                aria-expanded={uniSheetOpen}
                aria-haspopup="dialog"
                onClick={openUniFromCompact}
              >
                <span className="browse-location-name">{selectedUniversityAbbr}</span>
                <svg className="city-caret" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M4 6l4 4 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              className="browse-camera-btn"
              aria-label="Open camera"
              onClick={() => router.push("/camera")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="browse-filters">
          {appliedDateFilter ? (
            <div className="filter-pill-with-clear">
              <button type="button" className="filter-pill filter-pill-date-value" onClick={openDateSheet}>
                {formatDateChipDisplay(appliedDateFilter)}
              </button>
              <button
                type="button"
                className="filter-pill-clear-x"
                aria-label="Clear date filter"
                onClick={() => setAppliedDateFilter(undefined)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ) : (
            <button type="button" className="filter-pill" onClick={openDateSheet}>
              Date
            </button>
          )}
          {appliedPriceTier !== undefined ? (
            <div className="filter-pill-with-clear">
              <button type="button" className="filter-pill filter-pill-date-value" onClick={openPriceSheet}>
                {PRICE_TIER_LABELS[appliedPriceTier]}
              </button>
              <button
                type="button"
                className="filter-pill-clear-x"
                aria-label="Clear price filter"
                onClick={() => setAppliedPriceTier(undefined)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ) : (
            <button type="button" className="filter-pill" onClick={openPriceSheet}>
              Price
            </button>
          )}
          {appliedAmenities.length > 0 ? (
            <div className="filter-pill-with-clear">
              <button type="button" className="filter-pill filter-pill-date-value" onClick={openAmenitiesSheet}>
                {formatAmenitiesChip(appliedAmenities)}
              </button>
              <button
                type="button"
                className="filter-pill-clear-x"
                aria-label="Clear amenities filter"
                onClick={() => setAppliedAmenities([])}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ) : (
            <button type="button" className="filter-pill" onClick={openAmenitiesSheet}>
              Amenities
            </button>
          )}
          <div className="filter-spacer" />
          <button type="button" className="search-btn" aria-label="Search" onClick={() => router.push("/browse/search")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="10.5" cy="10.5" r="6.5" stroke="white" strokeWidth="1.8" />
              <path d="M15.5 15.5L20 20" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        </div>

        {communityFlyers.length > 0 ? (
          <section className="browse-category-strip community-section" aria-label="Community">
            <div className="browse-section-head">
              <span className="browse-section-title">community</span>
              <span className="browse-section-sub">posted by organisers</span>
            </div>
            <div className="browse-h-scroll">
              {communityFlyers.map((flyer) => {
                const shouldTrackImpression = !trackedImpressions.current.has(flyer.id);
                if (shouldTrackImpression) {
                  trackedImpressions.current.add(flyer.id);
                  void trackFlyerEvent(flyer.id, "impression");
                }
                return (
                  <div
                    key={flyer.id}
                    className="event-card event-card--strip community-card"
                    onClick={() => void trackFlyerEvent(flyer.id, "click")}
                  >
                    <div className="card-image">
                      {flyer.imageUrl ? (
                        <img
                          src={flyer.imageUrl}
                          alt={flyer.title}
                          className="card-image-flyer"
                          draggable={false}
                        />
                      ) : (
                        <div
                          className="card-image-placeholder"
                          style={{
                            background: `linear-gradient(135deg, ${flyer.color} 0%, ${flyer.accent}22 100%)`,
                          }}
                        />
                      )}
                      <button
                        type="button"
                        className="card-heart-btn card-glass-btn"
                        aria-label="Save"
                        onClick={(e) => {
                          e.stopPropagation();
                          void trackFlyerEvent(flyer.id, "save");
                        }}
                      >
                        <HeartIcon filled={false} />
                      </button>
                    </div>
                    <div className="card-body">
                      <h3 className="card-title">{flyer.title}</h3>
                      <div className="card-description">
                        <span className="card-posted-by">by {flyer.postedBy}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="browse-section-head">
          <span className="browse-section-title">trending</span>
          <span className="browse-section-sub">what people are loving</span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="browse-empty">
            <p className="browse-empty-title">We came up empty...</p>
            <p className="browse-empty-desc">Relax your filters and let&apos;s find your next event.</p>
            <button type="button" className="browse-empty-reset" onClick={resetFilters}>
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            {filteredTrending.length > 0 ? (
              <div className="masonry-grid">
                <div className="masonry-col">
                  {leftCol.map((ev) => (
                    <EventCard key={ev.id} event={ev} onDots={openCtx} layout="grid" />
                  ))}
                </div>
                <div className="masonry-col masonry-col--stagger">
                  {rightCol.map((ev) => (
                    <EventCard key={ev.id} event={ev} onDots={openCtx} layout="grid" />
                  ))}
                </div>
              </div>
            ) : null}

            {filteredOtherSections.length > 0 ? (
              <div className="browse-other-block">
                <div className="browse-section-head browse-section-head--other">
                  <span className="browse-section-title">Other</span>
                  <span className="browse-section-sub">explore by vibe</span>
                </div>
                {filteredOtherSections.map((section) => (
                  <section key={section.id} className="browse-category-strip" aria-label={section.label}>
                    <h3 className="browse-category-title">{section.label}</h3>
                    <div className="browse-h-scroll">
                      {section.events.map((ev) => (
                        <EventCard key={ev.id} event={ev} onDots={openCtx} layout="strip" />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>

      <div
        className={`browse-sheet-overlay${sheetOverlayOpen ? " open" : ""}`}
        onClick={() => {
          setUniSheetOpen(false);
          setDateSheetOpen(false);
          setPriceSheetOpen(false);
          setAmenitiesSheetOpen(false);
        }}
        aria-hidden={!sheetOverlayOpen}
      />

      <div
        className={`browse-bottom-sheet${uniSheetOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!uniSheetOpen}
        aria-label="Choose your university"
      >
        <div className="browse-sheet-handle" />
        <div className="browse-uni-list browse-uni-list--top">
          {universitiesForPickerFinal.map((u) => {
            const isSelected = u.id === selectedUniversityId;
            return (
              <button
                key={u.id}
                type="button"
                className="browse-uni-row"
                aria-current={isSelected ? "true" : undefined}
                onClick={() => {
                  setSelectedUniversityId(u.id);
                  const prev = getUserProfile();
                  setUserProfile({
                    ...(prev ?? { name: "", university: "" }),
                    universityId: u.id,
                    university: u.name,
                    universityAbbr: u.abbr,
                  });
                  setUniSheetOpen(false);
                }}
              >
                <div className="browse-uni-row-text">
                  <span className="browse-uni-name">{u.abbr}</span>
                  <span className="browse-uni-city">{u.city}</span>
                </div>
                <span className={`browse-uni-radio${isSelected ? " is-selected" : ""}`} aria-hidden />
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`browse-bottom-sheet browse-date-sheet${dateSheetOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!dateSheetOpen}
        aria-label="Choose a date"
      >
        <div className="browse-sheet-handle" />
        <div className="browse-date-quick-row">
          <button
            type="button"
            className={`browse-date-quick-btn${activeQuick === "month" ? " is-active" : ""}`}
            onClick={pickThisMonth}
          >
            This Month
          </button>
          <button
            type="button"
            className={`browse-date-quick-btn${activeQuick === "weekend" ? " is-active" : ""}`}
            onClick={pickWeekend}
          >
            This Weekend
          </button>
          <button
            type="button"
            className={`browse-date-quick-btn${activeQuick === "tonight" ? " is-active" : ""}`}
            onClick={pickTonight}
          >
            Tonight
          </button>
        </div>
        <div className="browse-date-calendar-wrap">
          <Calendar
            mode="single"
            navLayout="around"
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            selected={pendingDate}
            onSelect={(selected) => {
              setPendingDate(selected ? startOfDay(selected) : undefined);
              setActiveQuick(null);
            }}
            showOutsideDays
          />
        </div>
        <div className="browse-date-confirm-wrap">
          <button
            type="button"
            className="browse-date-confirm"
            disabled={pendingDate === undefined}
            onClick={commitChooseDate}
          >
            Choose Date
          </button>
        </div>
      </div>

      <div
        className={`browse-bottom-sheet browse-amenities-sheet${amenitiesSheetOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!amenitiesSheetOpen}
        aria-label="Amenities"
      >
        <div className="browse-sheet-handle" />
        <div className="browse-amenities-header">
          <span className="browse-amenities-title">Amenities</span>
        </div>
        <div className="browse-amenities-list">
          {AMENITY_OPTIONS.map((opt) => {
            const checked = pendingAmenities.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                className={`browse-amenity-row${checked ? " is-selected" : ""}`}
                onClick={() => togglePendingAmenity(opt.id)}
                aria-pressed={checked}
              >
                <span className="browse-amenity-label">{opt.label}</span>
                <span className={`browse-amenity-check${checked ? " is-checked" : ""}`} aria-hidden>
                  {checked ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke="#000"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        <div className="browse-amenities-apply-wrap">
          <button type="button" className="browse-amenities-apply" onClick={applyAmenitiesFilter}>
            Apply
          </button>
        </div>
      </div>

      <div
        className={`browse-bottom-sheet browse-price-sheet${priceSheetOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!priceSheetOpen}
        aria-label="Price range"
      >
        <div className="browse-sheet-handle" />
        <div className="browse-price-header">
          <span className="browse-price-title">Price Range</span>
          <span className="browse-price-value">{pendingPriceTierLabel}</span>
        </div>
        <div className="browse-price-slider-row">
          <span className="browse-price-edge browse-price-edge--left">Free</span>
          <div
            className="browse-price-range-shell"
            style={{ "--browse-price-pct": `${pendingPriceSlider}%` } as CSSProperties}
          >
            <input
              type="range"
              className="browse-price-range"
              min={0}
              max={100}
              step={0.1}
              value={pendingPriceSlider}
              onChange={(e) => setPendingPriceSlider(Number(e.target.value))}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pendingPriceSlider}
              aria-valuetext={pendingPriceTierLabel}
            />
          </div>
          <span className="browse-price-edge browse-price-edge--right">$$$</span>
        </div>
        <div className="browse-price-apply-wrap">
          <button type="button" className="browse-price-apply" onClick={applyPriceFilter}>
            Apply
          </button>
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
