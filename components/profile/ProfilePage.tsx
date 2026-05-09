"use client";

import { startOfDay, startOfMonth } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import {
  UNIVERSITIES,
  ONBOARDING_HOME_UNIVERSITY_ID,
  ALL_EVENTS,
  formatDateChipDisplay,
  eventMatchesAppliedDate,
  upcomingSaturday,
  type EventItem,
  type AppliedDateFilter,
} from "@/lib/browse-data";
import {
  getUserProfile,
  getLikedEventIds,
  getCaptures,
  getDiscoveryCount,
  buildExportDataMailto,
  clearDeckStorage,
  hasDeckCredentials,
} from "@/lib/discoveries-store";
import { setPermissionStep } from "@/lib/onboarding-perms";

import { DiscoveriesStack, type DiscoveryStackItem } from "./DiscoveriesStack";

type ProfileStashItem = {
  id: string;
  type: "document" | "link" | "image" | "video";
  title: string;
  subtitle?: string | null;
  detailLabel?: string | null;
  sourceUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt?: string;
};

type ProfileLearnedFact = {
  id: string;
  text: string;
  type?: string;
  confidence?: number;
  generatedAt?: string;
};

function trimToWordBoundary(input: string, maxChars: number): string {
  const clean = input.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) {
    return clean;
  }
  const withinLimit = clean.slice(0, maxChars + 1);
  const lastSpace = withinLimit.lastIndexOf(" ");
  if (lastSpace <= 0) {
    return clean.slice(0, maxChars).trim();
  }
  return withinLimit.slice(0, lastSpace).trim();
}

function deriveAiInsights(likedEvents: EventItem[], captureCount: number): string[] {
  const raw: string[] = [];
  if (likedEvents.length === 0 && captureCount === 0) {
    raw.push("Save events you love first");
    raw.push("Flyer snaps count too");
    return raw.map((s) => trimToWordBoundary(s, 40));
  }

  const evening = likedEvents.filter((e) => /pm/i.test(e.date) && !/6\s*am/i.test(e.date)).length;
  const free = likedEvents.filter((e) => e.priceUsd === 0).length;
  const food = likedEvents.filter((e) => e.amenities.includes("food")).length;

  if (evening >= 2) raw.push("Drawn to evening events");
  if (free >= 2) raw.push("Free or low-cost hangs often");
  if (food >= 2) raw.push("Food-forward experiences");
  if (captureCount >= 2) raw.push("Collects flyer photos often");
  if (raw.length === 0 && likedEvents.length > 0) {
    raw.push(`Tracking ${likedEvents.length} saved event${likedEvents.length === 1 ? "" : "s"}`);
  }
  if (captureCount > 0 && captureCount < 2) {
    raw.push("Saves + a flyer snap");
  }
  return raw.slice(0, 6).map((s) => trimToWordBoundary(s, 40));
}
export default function ProfilePage() {
  const router = useRouter();
  const [profile] = useState(() => getUserProfile());
  const [sessionNow] = useState(() => Date.now());
  const [discoveryCount, setDiscoveryCount] = useState(() => getDiscoveryCount());
  const [stashes, setStashes] = useState<ProfileStashItem[]>([]);
  const [learnedFacts, setLearnedFacts] = useState<ProfileLearnedFact[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);

  const [uniSheetOpen, setUniSheetOpen] = useState(false);
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>(ONBOARDING_HOME_UNIVERSITY_ID);
  const [availableUniversities, setAvailableUniversities] = useState(UNIVERSITIES);

  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(2026, 4, 1));
  const [pendingDate, setPendingDate] = useState<Date | undefined>(undefined);
  const [activeQuick, setActiveQuick] = useState<"month" | "weekend" | "tonight" | null>(null);
  const [appliedDateFilter, setAppliedDateFilter] = useState<AppliedDateFilter | undefined>(undefined);

  const [likesVersion, setLikesVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const hasCredentials = hasDeckCredentials(profile);

  const selectedUniversity = useMemo(() => {
    return availableUniversities.find((u) => u.id === selectedUniversityId) ?? availableUniversities[0];
  }, [availableUniversities, selectedUniversityId]);

  const likedEventIds = useMemo(() => {
    void likesVersion;
    return getLikedEventIds();
  }, [likesVersion]);

  const likedEvents = useMemo(() => {
    const byId = new Map(ALL_EVENTS.map((ev) => [ev.id, ev]));
    return likedEventIds
      .slice()
      .reverse()
      .map((id) => byId.get(id))
      .filter((ev): ev is EventItem => Boolean(ev));
  }, [likedEventIds]);

  const captures = useMemo(() => {
    void likesVersion;
    return getCaptures();
  }, [likesVersion]);

  const dateFilteredLiked = useMemo(() => {
    let out = likedEvents;
    if (appliedDateFilter) {
      out = out.filter((ev) => eventMatchesAppliedDate(ev, appliedDateFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      out = out.filter((ev) => ev.title.toLowerCase().includes(q));
    }
    return out;
  }, [likedEvents, appliedDateFilter, searchQuery]);

  const stackItems: DiscoveryStackItem[] = useMemo(() => {
    const out: DiscoveryStackItem[] = [];
    const eventRecencyBase = sessionNow - 365 * 24 * 60 * 60 * 1000;
    for (let i = 0; i < dateFilteredLiked.length; i++) {
      const ev = dateFilteredLiked[i];
      out.push({
        kind: "event",
        key: `ev-${ev.id}`,
        title: ev.title,
        event: ev,
        savedAt: eventRecencyBase - i,
      });
    }
    for (const cap of captures) {
      out.push({
        kind: "capture",
        key: cap.id,
        title: "Saved flyer",
        capture: cap,
        savedAt: cap.createdAt,
      });
    }
    for (const stash of stashes) {
      out.push({
        kind: "stash",
        key: `stash-${stash.id}`,
        title: stash.title || "Saved item",
        savedAt: stash.createdAt ? new Date(stash.createdAt).getTime() : 0,
        stash: {
          type: stash.type,
          subtitle: stash.subtitle,
          detailLabel: stash.detailLabel,
          sourceUrl: stash.sourceUrl,
          thumbnailUrl: stash.thumbnailUrl,
        },
      });
    }
    out.sort((a, b) => b.savedAt - a.savedAt);
    return out;
  }, [captures, dateFilteredLiked, sessionNow, stashes]);

  const aiInsights = useMemo(() => {
    const persisted = learnedFacts
      .map((fact) => fact.text.trim())
      .filter((line) => line.length > 0)
      .slice(0, 8)
      .map((line) => trimToWordBoundary(line, 40));
    if (persisted.length > 0) {
      return persisted;
    }
    return deriveAiInsights(dateFilteredLiked, captures.length);
  }, [captures.length, dateFilteredLiked, learnedFacts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setGoogleConnected(localStorage.getItem("turnup_google_connected") === "1");
  }, []);

  useEffect(() => {
    const preferred = (profile?.availableUniversityIds ?? [])
      .map((id) => UNIVERSITIES.find((u) => u.id === id))
      .filter((u): u is (typeof UNIVERSITIES)[number] => Boolean(u));
    const universities = preferred.length > 0 ? preferred : UNIVERSITIES;
    setAvailableUniversities(universities);

    const nextSelected =
      universities.find((u) => u.id === profile?.universityId)?.id ??
      universities.find((u) => u.name === profile?.university)?.id ??
      universities[0]?.id ??
      ONBOARDING_HOME_UNIVERSITY_ID;
    setSelectedUniversityId(nextSelected);
  }, [profile]);

  useEffect(() => {
    const t = setInterval(() => {
      setLikesVersion((v) => v + 1);
    }, 1200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!hasCredentials) {
      clearDeckStorage();
    }

    let isMounted = true;

    const loadStashes = async () => {
      try {
        const response = await fetch("/api/profile?userId=demo-user", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          data?: {
            stashes?: ProfileStashItem[];
            learnedFacts?: ProfileLearnedFact[];
          };
        };
        if (!isMounted) return;
        setStashes(hasCredentials ? (payload.data?.stashes ?? []) : []);
        setLearnedFacts(payload.data?.learnedFacts ?? []);
      } catch {
        if (!isMounted) return;
        setStashes([]);
        setLearnedFacts([]);
      }
    };

    void loadStashes();
    const t = setInterval(() => {
      void loadStashes();
    }, 2000);
    return () => {
      isMounted = false;
      clearInterval(t);
    };
  }, [hasCredentials]);

  useEffect(() => {
    setDiscoveryCount(getDiscoveryCount() + stashes.length);
  }, [hasCredentials, likesVersion, stashes.length]);

  useEffect(() => {
    if (!uniSheetOpen && !dateSheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUniSheetOpen(false);
        setDateSheetOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [uniSheetOpen, dateSheetOpen]);

  const openDateSheet = () => {
    setUniSheetOpen(false);
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
  };

  const sheetOverlayOpen = uniSheetOpen || dateSheetOpen;

  const connectGoogle = () => {
    const ok = typeof window !== "undefined" && window.confirm("Connect your Google account to TurnUp?");
    if (ok && typeof window !== "undefined") {
      localStorage.setItem("turnup_google_connected", "1");
      setGoogleConnected(true);
    }
  };

  const exportData = () => {
    if (typeof window === "undefined") return;
    window.location.href = buildExportDataMailto();
  };

  return (
    <div className="browse-page profile-page">
      <div className="profile-header-row">
        <button type="button" className="profile-back-circle" onClick={() => router.push("/camera")} aria-label="Back to camera">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 6l-6 6 6 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="profile-header-text">
          <h1 className="profile-name">{profile?.name || "Your Name"}</h1>
          <p className="profile-university">
            {profile?.university || "University of Alberta"}
            {profile?.schoolEmail ? ` | ${profile.schoolEmail}` : ""}
          </p>
        </div>
      </div>

      <div className="masonry-scroll">
        <div className="browse-hero profile-discoveries-hero">
          <div className="profile-discoveries-head">
            <h2 className="profile-discoveries-title">Your Discoveries</h2>
            <p className="profile-discoveries-count">{discoveryCount} saved</p>
          </div>

          <div className="browse-filters profile-filters">
            <button
              type="button"
              className="filter-pill"
              onClick={() => setUniSheetOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={uniSheetOpen}
            >
              {selectedUniversity.abbr}
            </button>

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
                  ×
                </button>
              </div>
            ) : (
              <button type="button" className="filter-pill" onClick={openDateSheet}>
                Date
              </button>
            )}

            <input
              type="text"
              className="profile-search-input"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {stackItems.length === 0 ? (
          <div className="browse-empty">
            <p className="browse-empty-title">Nothing here yet…</p>
            <p className="browse-empty-desc">Heart events in Browse or save a flyer from Camera.</p>
            <button type="button" className="browse-empty-reset" onClick={resetFilters}>
              Reset filters
            </button>
          </div>
        ) : (
          <DiscoveriesStack items={stackItems} />
        )}

        <div className="profile-insights-section">
          <h2 className="profile-section-title profile-section-title--solo">What you&apos;re into — {aiInsights.length}</h2>
          <p className="profile-insights-sub">Notes from your discoveries</p>
          <ul className="profile-ai-insights-list">
            {aiInsights.map((line, i) => (
              <li key={i} className="profile-ai-insight">
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="profile-settings-section">
          <button
            type="button"
            className="profile-permission-btn"
            onClick={() => {
              setPermissionStep(0);
              router.push("/?resume=permissions");
            }}
          >
            Permissions Request
          </button>

          <div className="profile-settings-list">
            <button type="button" className="profile-settings-row" onClick={() => alert("Notification settings")}>
              <span>Notifications</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button type="button" className="profile-settings-row" onClick={() => alert("Data & privacy")}>
              <span>Data &amp; privacy</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button type="button" className="profile-settings-row" onClick={connectGoogle}>
              <span>Connected integrations {googleConnected ? "(Google on)" : ""}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button type="button" className="profile-settings-row" onClick={exportData}>
              <span>Export my data</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className="profile-settings-row profile-settings-row--destructive"
              onClick={() => alert("Delete profile data")}
            >
              <span>Delete profile data</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        className={`browse-sheet-overlay${sheetOverlayOpen ? " open" : ""}`}
        onClick={() => {
          setUniSheetOpen(false);
          setDateSheetOpen(false);
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
          {availableUniversities.map((u) => {
            const isSelected = u.id === selectedUniversityId;
            return (
              <button
                key={u.id}
                type="button"
                className="browse-uni-row"
                aria-current={isSelected ? "true" : undefined}
                onClick={() => {
                  setSelectedUniversityId(u.id);
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
    </div>
  );
}
