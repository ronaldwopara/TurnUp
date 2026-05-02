"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ImageUploadField } from "./ImageUploadField";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import { addCapture } from "@/lib/discoveries-store";

const byPrefixAndName = {
  fas: {
    link: faLink,
  },
} as const;

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="1.6" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function UploadsIcon() {
  return (
    <svg className="cam-upload-icon" viewBox="0 0 30 26" fill="none" aria-hidden>
      <g transform="translate(2.1 4.5) rotate(-13.5 5.8 7.8)">
        <rect
          x="1.2"
          y="0.8"
          width="10.8"
          height="15.6"
          rx="2.1"
          fill="none"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="1.9"
        />
      </g>
      <g transform="translate(10.7 2.5) rotate(-1.5 7.2 9.2)">
        <rect x="0.8" y="0.8" width="13.2" height="19" rx="2.5" fill="#fff" />
        <rect x="2.55" y="2.85" width="9.75" height="12.2" rx="1.5" fill="#8d6848" />
        <path d="M2.55 12.9L5.35 9.8L7.65 11.95L9.75 10.35L12.3 13.2V15.05H2.55V12.9Z" fill="#efdac0" />
        <circle cx="7.15" cy="7.4" r="1.15" fill="#f4e4cc" />
      </g>
    </svg>
  );
}

function LinksIcon() {
  return (
    <FontAwesomeIcon icon={byPrefixAndName.fas["link"]} className="cam-link-icon" aria-hidden />
  );
}

/**
 * Direct site favicons often fail in <img> because hosts send Cross-Origin-Resource-Policy: same-origin
 * (Instagram does). Google’s favicon service returns cross-origin-embeddable PNGs.
 */
function socialFaviconSrc(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

const SOCIAL_FAVICONS = [
  { id: "instagram", domain: "instagram.com", alt: "Instagram" },
  { id: "snapchat", domain: "snapchat.com", alt: "Snapchat" },
  { id: "linkedin", domain: "linkedin.com", alt: "LinkedIn" },
  { id: "facebook", domain: "facebook.com", alt: "Facebook" },
  { id: "tiktok", domain: "tiktok.com", alt: "TikTok" },
] as const;

const SOCIAL_FAN_TRANSFORMS = [
  { x: -16, deg: -18, z: 1 },
  { x: -8, deg: -9, z: 2 },
  { x: 0, deg: 0, z: 5 },
  { x: 8, deg: 9, z: 3 },
  { x: 16, deg: 18, z: 4 },
] as const;

function SocialsCardFan() {
  return (
    <div className="socials-card-fan" aria-hidden>
      {SOCIAL_FAVICONS.map((s, i) => {
        const t = SOCIAL_FAN_TRANSFORMS[i];
        return (
          <div
            key={s.id}
            className="socials-card-fan__card"
            style={{
              zIndex: t.z,
              transform: `translateX(${t.x}px) rotate(${t.deg}deg)`,
            }}
          >
            <img
              src={socialFaviconSrc(s.domain)}
              alt=""
              width={20}
              height={20}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          </div>
        );
      })}
    </div>
  );
}

const EVENT_PAGE_FAVICONS = [
  { id: "eventbrite", domain: "eventbrite.ca", alt: "Eventbrite" },
  { id: "luma", domain: "luma.com", alt: "Luma" },
  { id: "ticketmaster", domain: "ticketmaster.com", alt: "Ticketmaster" },
  { id: "posh", domain: "posh.vip", alt: "Posh" },
] as const;

const EVENT_FAN_TRANSFORMS = [
  { x: -14, deg: -17, z: 1 },
  { x: -5, deg: -8, z: 3 },
  { x: 5, deg: 8, z: 4 },
  { x: 14, deg: 17, z: 2 },
] as const;

function EventPageCardFan() {
  return (
    <div className="event-page-card-fan" aria-hidden>
      {EVENT_PAGE_FAVICONS.map((s, i) => {
        const t = EVENT_FAN_TRANSFORMS[i];
        return (
          <div
            key={s.id}
            className="event-page-card-fan__card"
            style={{
              zIndex: t.z,
              transform: `translateX(${t.x}px) rotate(${t.deg}deg)`,
            }}
          >
            <img
              src={socialFaviconSrc(s.domain)}
              alt=""
              width={20}
              height={20}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          </div>
        );
      })}
    </div>
  );
}

export default function CameraPage() {
  const router = useRouter();
  const [sheet, setSheet] = useState<"uploads" | "links" | null>(null);
  const [sheetUploadImage, setSheetUploadImage] = useState<File | string | null>(null);

  const openSheet = (type: "uploads" | "links") => setSheet(type);
  const closeSheet = () => setSheet(null);

  return (
    <div className="camera-view">
      <div className="camera-lens">
        <div className="camera-grid" />
      </div>

      <div className="cam-top">
        <button type="button" className="cam-back" onClick={() => router.push("/browse")}>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden>
            <path d="M7 1L1 7l6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Browse Events
        </button>
        <button type="button" className="cam-profile" onClick={() => router.push("/profile")}>
          <div className="cam-profile-icon">
            <ProfileIcon />
          </div>
        </button>
      </div>

      <div className="cam-bottom">
        <button type="button" className="cam-ctrl" onClick={() => openSheet("uploads")}>
          <UploadsIcon />
        </button>
        <button type="button" className="cam-shutter" aria-label="Take photo" />
        <button type="button" className="cam-ctrl" onClick={() => openSheet("links")}>
          <LinksIcon />
        </button>
      </div>

      <div className={`sheet-overlay${sheet ? " open" : ""}`} onClick={closeSheet} />

      <div className={`bottom-sheet${sheet === "uploads" ? " open" : ""}`}>
        <div className="sheet-handle" />
        <div className="sheet-title">Add uploads</div>
        <div className="sheet-upload-section">
          <p className="sheet-upload-heading">From your device</p>
          <ImageUploadField
            value={sheetUploadImage}
            onChange={setSheetUploadImage}
            aspectRatio={2.1}
            onCaptureSave={(dataUrl) => {
              addCapture(dataUrl);
            }}
          />
        </div>
        <div className="sheet-options sheet-options-links-row">
          {(["Photo Library", "Files"] as const).map((title) => (
            <button
              type="button"
              className="sheet-option sheet-option-pill sheet-option-pill--upload"
              key={title}
              onClick={closeSheet}
            >
              <span className="sheet-option-title">{title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`bottom-sheet${sheet === "links" ? " open" : ""}`}>
        <div className="sheet-handle" />
        <div className="sheet-title">Insert link</div>
        <input className="sheet-input" placeholder="Paste a URL here..." />
        <div className="sheet-options sheet-options-links-row">
          <button
            type="button"
            className="sheet-option sheet-option-pill sheet-option-pill--socials"
            onClick={closeSheet}
          >
            <SocialsCardFan />
            <div className="sheet-option-text">
              <span className="sheet-option-title">Socials</span>
            </div>
          </button>
          <button
            type="button"
            className="sheet-option sheet-option-pill sheet-option-pill--event"
            onClick={closeSheet}
          >
            <EventPageCardFan />
            <div className="sheet-option-text">
              <span className="sheet-option-title">Event page</span>
            </div>
          </button>
        </div>
        <button type="button" className="sheet-btn" style={{ marginTop: 16 }} onClick={closeSheet}>
          Insert
        </button>
      </div>
    </div>
  );
}
