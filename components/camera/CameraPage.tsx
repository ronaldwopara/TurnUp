"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M6 24l6-8 5 6 4-5 5 7H6z" fill="rgba(255,255,255,0.85)" />
      <circle cx="22" cy="10" r="3" fill="rgba(255,255,255,0.85)" />
    </svg>
  );
}

function LinksIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M13 19l-1.5 1.5a4 4 0 01-5.657-5.657l3-3A4 4 0 0114.5 12.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M19 13l1.5-1.5a4 4 0 015.657 5.657l-3 3A4 4 0 0117.5 19.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M12 20l8-8" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
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
          <span className="cam-profile-label">profile</span>
        </button>
      </div>

      <div className="cam-bottom">
        <button type="button" className="cam-ctrl" onClick={() => openSheet("uploads")}>
          <UploadsIcon />
          <span className="cam-ctrl-label">uploads</span>
        </button>
        <button type="button" className="cam-shutter" aria-label="Take photo" />
        <button type="button" className="cam-ctrl" onClick={() => openSheet("links")}>
          <LinksIcon />
          <span className="cam-ctrl-label">links</span>
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
