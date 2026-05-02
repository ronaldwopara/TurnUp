"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { ImageUploadField } from "./ImageUploadField";
import { AddToCalendarButton } from "@/components/ui/AddToCalendarButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import { addCapture } from "@/lib/discoveries-store";

const byPrefixAndName = {
  fas: {
    link: faLink,
  },
} as const;

const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);

async function fileFromSheetUploadValue(value: File | string | null): Promise<File | null> {
  if (value == null) {
    return null;
  }
  if (value instanceof File) {
    return value;
  }
  if (typeof value === "string" && value.startsWith("data:")) {
    const res = await fetch(value);
    const blob = await res.blob();
    const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
    return new File([blob], `turnup-upload.${ext}`, { type: blob.type || "image/jpeg" });
  }
  return null;
}

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
  const [linkValue, setLinkValue] = useState("");
  const [statusMessage, setStatusMessage] = useState("Requesting camera access...");
  const [parsedEvent, setParsedEvent] = useState<{ title: string; googleCalendarUrl?: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const userId = "demo-user";

  const openSheet = (type: "uploads" | "links") => setSheet(type);
  const closeSheet = () => setSheet(null);

  async function getUserMediaCompat(constraints: MediaStreamConstraints) {
    if (navigator.mediaDevices?.getUserMedia) {
      return navigator.mediaDevices.getUserMedia(constraints);
    }

    const legacyNavigator = navigator as Navigator & {
      getUserMedia?: (
        constraints: MediaStreamConstraints,
        successCallback: (stream: MediaStream) => void,
        errorCallback: (error: DOMException) => void
      ) => void;
      webkitGetUserMedia?: (
        constraints: MediaStreamConstraints,
        successCallback: (stream: MediaStream) => void,
        errorCallback: (error: DOMException) => void
      ) => void;
      mozGetUserMedia?: (
        constraints: MediaStreamConstraints,
        successCallback: (stream: MediaStream) => void,
        errorCallback: (error: DOMException) => void
      ) => void;
    };

    const legacyGetUserMedia =
      legacyNavigator.getUserMedia ?? legacyNavigator.webkitGetUserMedia ?? legacyNavigator.mozGetUserMedia;

    if (!legacyGetUserMedia) {
      throw new Error("getUserMedia is unavailable in this browser.");
    }

    return await new Promise<MediaStream>((resolve, reject) => {
      legacyGetUserMedia.call(legacyNavigator, constraints, resolve, reject);
    });
  }

  async function requestCameraStream() {
    const attempts: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      },
      {
        video: true,
        audio: false,
      },
    ];

    let lastError: unknown;
    for (const constraints of attempts) {
      try {
        return await getUserMediaCompat(constraints);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error("Unable to access camera.");
  }

  useEffect(() => {
    let isMounted = true;

    async function initCamera() {
      if (!window.isSecureContext) {
        if (isMounted) {
          setStatusMessage("Camera needs HTTPS in Safari. Open this app over HTTPS (or localhost).");
          setCameraReady(false);
        }
        return;
      }

      try {
        const stream = await requestCameraStream();

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          video.autoplay = true;
          video.muted = true;
          video.setAttribute("playsinline", "true");

          try {
            await video.play();
          } catch {
            // Safari can reject the first play() call before metadata is ready.
          }
        }
        setCameraReady(true);
        setStatusMessage("Point camera at an event flyer.");
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        setCameraReady(false);
        if (name === "NotAllowedError" || name === "SecurityError") {
          setStatusMessage("Camera permission denied. Use Uploads to continue.");
          return;
        }
        if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setStatusMessage("No camera found on this device. Use Uploads to continue.");
          return;
        }
        setStatusMessage("Camera unavailable right now. Use Uploads to continue.");
      }
    }

    initCamera();
    return () => {
      isMounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  async function submitImage(file: File, options?: { clearSheetUpload?: boolean }) {
    if (file.type && !SUPPORTED_IMAGE_TYPES.has(file.type.toLowerCase())) {
      setStatusMessage("Unsupported image type. Use PNG, JPEG, WEBP, or GIF.");
      setParsedEvent(null);
      return;
    }
    setIsBusy(true);
    setStatusMessage("Analyzing flyer...");
    setParsedEvent(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);

      const response = await fetch("/api/ingest/image", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Image ingest failed");
      }

      const payload = (await response.json()) as {
        data?: {
          event?: { title?: string };
          calendarPayload?: { googleCalendarUrl?: string };
        };
      };
      const title = payload.data?.event?.title ?? "Event parsed";
      const isNoFlyerFound = title.trim().toLowerCase() === "no flyer found";
      setStatusMessage(isNoFlyerFound ? "No flyer found" : "Add to calendar");
      setParsedEvent({
        title,
        googleCalendarUrl: isNoFlyerFound ? undefined : payload.data?.calendarPayload?.googleCalendarUrl,
      });
      if (options?.clearSheetUpload) {
        setSheetUploadImage(null);
        closeSheet();
      }
    } catch {
      setStatusMessage("Could not parse image. Try another photo.");
      setParsedEvent(null);
    } finally {
      setIsBusy(false);
    }
  }

  async function onAnalyzeSheetUpload() {
    if (isBusy) {
      return;
    }
    const file = await fileFromSheetUploadValue(sheetUploadImage);
    if (!file) {
      setStatusMessage("Choose an image first.");
      return;
    }
    await submitImage(file, { clearSheetUpload: true });
  }

  async function onTakePhoto() {
    const video = videoRef.current;
    if (!video || !cameraReady || isBusy) {
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      setStatusMessage("Camera is still initializing.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setStatusMessage("Unable to capture photo on this device.");
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((value) => resolve(value), "image/jpeg", 0.96)
    );
    if (!blob) {
      setStatusMessage("Photo capture failed. Please retry.");
      return;
    }

    const file = new File([blob], `turnup-${Date.now()}.jpg`, { type: "image/jpeg" });
    await submitImage(file);
  }

  async function onPickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    await submitImage(file);
    closeSheet();
  }

  async function onSubmitLink() {
    if (!linkValue.trim() || isBusy) {
      return;
    }

    setIsBusy(true);
    setStatusMessage("Analyzing link...");
    setParsedEvent(null);
    try {
      const response = await fetch("/api/ingest/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          url: linkValue.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Link ingest failed");
      }

      const payload = (await response.json()) as {
        data?: {
          event?: { title?: string };
          calendarPayload?: { googleCalendarUrl?: string };
        };
      };
      const title = payload.data?.event?.title ?? "Event parsed";
      const isNoFlyerFound = title.trim().toLowerCase() === "no flyer found";
      setStatusMessage(isNoFlyerFound ? "No flyer found" : "Add to calendar");
      setParsedEvent({
        title,
        googleCalendarUrl: isNoFlyerFound ? undefined : payload.data?.calendarPayload?.googleCalendarUrl,
      });
      setLinkValue("");
      closeSheet();
    } catch {
      setStatusMessage("Could not parse that link. Please try another.");
      setParsedEvent(null);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="camera-view">
      <div className="camera-lens">
        <video ref={videoRef} className={`camera-feed${cameraReady ? " ready" : ""}`} playsInline muted autoPlay />
        <div className="camera-grid" />
        <div className="camera-status">{isBusy ? "Processing..." : statusMessage}</div>
      </div>
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onPickFile}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        style={{ display: "none" }}
        onChange={onPickFile}
      />

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
        <button type="button" className="cam-shutter" aria-label="Take photo" onClick={onTakePhoto} />
        <button type="button" className="cam-ctrl" onClick={() => openSheet("links")}>
          <LinksIcon />
        </button>
      </div>
      {parsedEvent ? (
        <div className="camera-result-card" role="status" aria-live="polite">
          <div className="camera-result-title">Ready to add this event?</div>
          <div className="camera-result-name">{parsedEvent.title}</div>
          <AddToCalendarButton
            className="camera-result-action"
            onClick={() => {
              if (parsedEvent.googleCalendarUrl) {
                window.open(parsedEvent.googleCalendarUrl, "_blank", "noopener,noreferrer");
              }
            }}
            disabled={!parsedEvent.googleCalendarUrl}
          />
        </div>
      ) : null}

      <div className={`sheet-overlay${sheet ? " open" : ""}`} onClick={closeSheet} />

      <div className={`bottom-sheet bottom-sheet--uploads${sheet === "uploads" ? " open" : ""}`}>
        <div className="sheet-handle" />
        <h2 className="sheet-title">Add uploads</h2>
        <div className="sheet-upload-section">
          <p className="sheet-upload-heading">From your device</p>
          <ImageUploadField
            value={sheetUploadImage}
            onChange={setSheetUploadImage}
            aspectRatio={1.55}
            disabled={isBusy}
            isLoading={isBusy && sheet === "uploads"}
            onCaptureSave={(dataUrl) => {
              addCapture(dataUrl);
            }}
          />
        </div>
        <div className="sheet-upload-footer">
          <button
            type="button"
            className="sheet-btn sheet-btn--analyze"
            onClick={() => void onAnalyzeSheetUpload()}
            disabled={isBusy || sheetUploadImage == null}
          >
            {isBusy ? "Analyzing…" : "Analyze flyer"}
          </button>
          <div className="sheet-upload-footer__sources">
            <button
              type="button"
              className="sheet-source-pill sheet-source-pill--primary"
              onClick={() => galleryInputRef.current?.click()}
            >
              Photo Library
            </button>
            <button type="button" className="sheet-source-pill" onClick={() => fileInputRef.current?.click()}>
              Files
            </button>
          </div>
        </div>
      </div>

      <div className={`bottom-sheet bottom-sheet--links${sheet === "links" ? " open" : ""}`}>
        <div className="sheet-handle" />
        <h2 className="sheet-title">Insert link</h2>
        <input
          id="cam-link-input"
          className="sheet-input"
          placeholder="Paste a URL here..."
          value={linkValue}
          onChange={(event) => setLinkValue(event.target.value)}
          autoComplete="off"
          autoCorrect="off"
        />
        <div className="sheet-link-chips" role="presentation">
          <button
            type="button"
            className="sheet-link-chip"
            onClick={() => document.getElementById("cam-link-input")?.focus()}
          >
            <SocialsCardFan />
            <span className="sheet-link-chip-label">Socials</span>
          </button>
          <button
            type="button"
            className="sheet-link-chip"
            onClick={() => document.getElementById("cam-link-input")?.focus()}
          >
            <EventPageCardFan />
            <span className="sheet-link-chip-label">Event page</span>
          </button>
        </div>
        <button type="button" className="sheet-btn" onClick={onSubmitLink} disabled={isBusy}>
          {isBusy ? "Working..." : "Insert"}
        </button>
      </div>
    </div>
  );
}
