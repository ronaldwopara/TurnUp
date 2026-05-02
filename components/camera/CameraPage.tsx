"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";

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

export default function CameraPage() {
  const router = useRouter();
  const [sheet, setSheet] = useState<"uploads" | "links" | null>(null);

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
        <button type="button" className="cam-profile">
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
        <div className="sheet-options">
          {[
            { icon: "🖼", title: "Photo Library", sub: "Choose from your camera roll" },
            { icon: "📁", title: "Files", sub: "Browse documents and files" },
            { icon: "📷", title: "Take Photo", sub: "Snap a new image now" },
          ].map((o) => (
            <button type="button" className="sheet-option" key={o.title} onClick={closeSheet}>
              <div className="sheet-option-icon">
                <span style={{ fontSize: 20 }}>{o.icon}</span>
              </div>
              <div className="sheet-option-text">
                <span className="sheet-option-title">{o.title}</span>
                <span className="sheet-option-sub">{o.sub}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={`bottom-sheet${sheet === "links" ? " open" : ""}`}>
        <div className="sheet-handle" />
        <div className="sheet-title">Insert link</div>
        <input className="sheet-input" placeholder="Paste a URL here..." />
        <div className="sheet-options">
          {[
            { icon: "🎟", title: "Ticket link", sub: "Link to buy or register" },
            { icon: "📍", title: "Venue link", sub: "Google Maps or address" },
            { icon: "🔗", title: "Event page", sub: "Any external event link" },
          ].map((o) => (
            <button type="button" className="sheet-option" key={o.title} onClick={closeSheet}>
              <div className="sheet-option-icon">
                <span style={{ fontSize: 20 }}>{o.icon}</span>
              </div>
              <div className="sheet-option-text">
                <span className="sheet-option-title">{o.title}</span>
                <span className="sheet-option-sub">{o.sub}</span>
              </div>
            </button>
          ))}
        </div>
        <button type="button" className="sheet-btn" style={{ marginTop: 16 }} onClick={closeSheet}>
          Insert
        </button>
      </div>
    </div>
  );
}
