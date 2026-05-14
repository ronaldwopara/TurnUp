"use client";

import { useCallback, useEffect, useState } from "react";

import { INTEREST_CATEGORIES } from "@/lib/interest-tags-data";
import { getUserProfile, setUserProfile } from "@/lib/discoveries-store";

import "@/app/browse.css";
import "@/app/profile.css";

function BackChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 6l-6 6 6 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export type InterestsSelectionScreenProps = {
  variant: "onboarding" | "settings";
  onBack: () => void;
  /** Called after interests are saved when the user taps Continue (onboarding only). */
  onContinue?: () => void;
};

export default function InterestsSelectionScreen({ variant, onBack, onContinue }: InterestsSelectionScreenProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const profile = getUserProfile();
    const ids = profile?.interestTagIds ?? [];
    setSelected(new Set(ids));
    setHydrated(true);
  }, []);

  const persistSelection = useCallback((next: Set<string>) => {
    const prev = getUserProfile();
    setUserProfile({
      ...(prev ?? { name: "", university: "" }),
      interestTagIds: Array.from(next),
    });
  }, []);

  const toggleTag = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistSelection(next);
      return next;
    });
  };

  const handleContinue = () => {
    persistSelection(selected);
    onContinue?.();
  };

  if (!hydrated) {
    return (
      <div
        className={`browse-page profile-page interests-page${variant === "onboarding" ? " interests-page--splash" : ""}`}
      >
        <div className="profile-header-row">
          <div className="profile-header-text">
            <h2 className="profile-discoveries-title">Your Interests</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`browse-page profile-page interests-page${variant === "onboarding" ? " interests-page--splash" : ""}`}
    >
      <header className="profile-header-row interests-header">
        <button type="button" className="profile-back-circle" onClick={onBack} aria-label="Back">
          <BackChevron />
        </button>
        <div className="profile-header-text">
          <h2 className="profile-discoveries-title interests-title">Your Interests</h2>
          <p className="profile-discoveries-count interests-subtitle">Select what you&apos;re into to personalize your feed.</p>
        </div>
      </header>

      <div className="masonry-scroll interests-scroll">
        <div className="interests-categories">
          {INTEREST_CATEGORIES.map((category) => (
            <section key={category.id} className="interests-category-block">
              <h3 className="profile-section-title interests-category-title">{category.title}</h3>
              <div className="interests-tag-row">
                {category.tags.map((tag) => {
                  const isOn = selected.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={`filter-pill interest-tag${isOn ? " interest-tag--selected" : ""}`}
                      aria-pressed={isOn}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {variant === "onboarding" ? (
        <div className="interests-footer">
          <button type="button" className="profile-permission-btn interests-continue-btn" onClick={handleContinue}>
            Continue
          </button>
        </div>
      ) : null}
    </div>
  );
}
