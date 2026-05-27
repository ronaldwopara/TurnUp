"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { ImageUploadField } from "./ImageUploadField";
import { AddToCalendarButton } from "@/components/ui/AddToCalendarButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import { formatIngestEventSchedule } from "@/lib/browse-event-detail";
import { addCapture, hasDeckCredentials, getUserId, getUserProfile } from "@/lib/discoveries-store";

type ParsedEventResult = {
  title: string;
  description?: string;
  location?: string;
  eventDate?: string;
  googleCalendarUrl?: string;
};

type IngestResponseData = {
  event?: {
    title?: string;
    description?: string;
    location?: string;
    date?: string;
    time?: string;
  };
  calendarPayload?: { googleCalendarUrl?: string };
};

function mapIngestToParsedEvent(data?: IngestResponseData): ParsedEventResult | null {
  const title = data?.event?.title?.trim() ?? "";
  if (!title || title.toLowerCase() === "no flyer found") {
    return null;
  }
  return {
    title,
    description: data?.event?.description?.trim() || undefined,
    location: data?.event?.location?.trim() || undefined,
    eventDate: formatIngestEventSchedule(data?.event?.date, data?.event?.time),
    googleCalendarUrl: data?.calendarPayload?.googleCalendarUrl,
  };
}

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

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
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
  const [parsedEvent, setParsedEvent] = useState<ParsedEventResult | null>(null);
  const [lastCaptureDataUrl, setLastCaptureDataUrl] = useState<string | null>(null);
  const [lastIngestSourceUrl, setLastIngestSourceUrl] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postFeedback, setPostFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [pendingFlyerId, setPendingFlyerId] = useState<string | null>(null);
  const [showNeedsImagePrompt, setShowNeedsImagePrompt] = useState(false);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const posterUploadInputRef = useRef<HTMLInputElement | null>(null);
  const canPersistDeck = hasDeckCredentials();
  const userId = getUserId();

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
    setIsBusy(true);
    setStatusMessage("Analyzing flyer...");
    setParsedEvent(null);
    setLastIngestSourceUrl(null);
    try {
      if (file.type && !SUPPORTED_IMAGE_TYPES.has(file.type.toLowerCase())) {
        setStatusMessage("Unsupported image type. Use PNG, JPEG, WEBP, or GIF.");
        setParsedEvent(null);
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);
      formData.append("persistDeck", String(canPersistDeck));

      const response = await fetch("/api/ingest/image", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Image ingest failed");
      }

      const payload = (await response.json()) as { data?: IngestResponseData } | IngestResponseData;
      const ingestData = ("data" in payload ? payload.data : payload) as IngestResponseData | undefined;
      const parsed = mapIngestToParsedEvent(ingestData);
      setStatusMessage(parsed ? "" : "No flyer found");
      setParsedEvent(parsed);
      if (parsed) {
        try {
          const dataUrl = await fileToDataUrl(file);
          if (dataUrl.startsWith("data:image/")) {
            setLastCaptureDataUrl(dataUrl);
            addCapture(dataUrl);
          }
        } catch {
          // poster can still be uploaded later via needsImage flow
        }
        closeSheet();
        if (options?.clearSheetUpload) {
          setSheetUploadImage(null);
        }
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
    const captureDataUrl = canvas.toDataURL("image/jpeg", 0.88);
    addCapture(captureDataUrl);
    setLastCaptureDataUrl(captureDataUrl);
    await submitImage(file);
  }

  async function onPickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    await submitImage(file);
  }

  async function onSubmitLink() {
    if (!linkValue.trim() || isBusy) {
      return;
    }

    setIsBusy(true);
    setStatusMessage("Analyzing link...");
    setParsedEvent(null);
    const submittedUrl = linkValue.trim();
    try {
      const response = await fetch("/api/ingest/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          url: submittedUrl,
          persistDeck: canPersistDeck,
        }),
      });

      if (!response.ok) {
        throw new Error("Link ingest failed");
      }

      const payload = (await response.json()) as { data?: IngestResponseData } | IngestResponseData;
      const ingestData = ("data" in payload ? payload.data : payload) as IngestResponseData | undefined;
      const parsed = mapIngestToParsedEvent(ingestData);
      setStatusMessage(parsed ? "" : "No flyer found");
      setParsedEvent(parsed);
      if (parsed) {
        setLastIngestSourceUrl(submittedUrl);
      }
      setLinkValue("");
      closeSheet();
    } catch {
      setStatusMessage("Could not parse that link. Please try another.");
      setParsedEvent(null);
    } finally {
      setIsBusy(false);
    }
  }

  const cameraStatusText = isBusy && !parsedEvent ? "Processing..." : statusMessage;
  const profile = getUserProfile();
  const isOrganiser = profile?.role === "organiser";

  function resetNeedsImagePrompt() {
    setShowNeedsImagePrompt(false);
    setPendingFlyerId(null);
    setLastCaptureDataUrl(null);
    setLastIngestSourceUrl(null);
  }

  function skipNeedsImage() {
    resetNeedsImagePrompt();
    setPostFeedback(null);
    router.push("/browse");
  }

  async function onPosterFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !pendingFlyerId) {
      return;
    }

    setIsUploadingPoster(true);
    setPostFeedback(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(`/api/flyers/${pendingFlyerId}/image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        setPostFeedback({
          tone: "error",
          message: "Could not upload image. Try another file or skip for now.",
        });
        return;
      }

      setPostFeedback({ tone: "success", message: "Poster uploaded!" });
      resetNeedsImagePrompt();
      setTimeout(() => router.push("/browse"), 800);
    } catch {
      setPostFeedback({ tone: "error", message: "Could not upload image. Please try again." });
    } finally {
      setIsUploadingPoster(false);
    }
  }

  async function postToBrowse() {
    if (!parsedEvent || isPosting) return;

    setIsPosting(true);
    setPostFeedback(null);
    setShowNeedsImagePrompt(false);
    setPendingFlyerId(null);

    try {
      const uniName = profile?.university || profile?.universityAbbr || "";
      const displayName = uniName ? `${uniName} Student` : undefined;

      const imageUrl = lastCaptureDataUrl?.trim().startsWith("data:image/")
        ? lastCaptureDataUrl.trim()
        : undefined;

      const response = await fetch("/api/flyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: parsedEvent.title,
          description: [parsedEvent.description, parsedEvent.location].filter(Boolean).join("\n\n") || undefined,
          eventDate: parsedEvent.eventDate,
          imageUrl,
          sourceUrl: lastIngestSourceUrl ?? undefined,
          calendarUrl: parsedEvent.googleCalendarUrl,
          displayName,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | { message?: string }
          | null;
        const apiMessage =
          payload && "error" in payload && typeof payload.error?.message === "string"
            ? payload.error.message
            : undefined;
        setPostFeedback({
          tone: "error",
          message: apiMessage ?? "Posting failed. Please try again.",
        });
        return;
      }

      const payload = (await response.json()) as {
        data?: { id?: string; needsImage?: boolean };
      };
      const flyerId = payload.data?.id;
      const needsImage = Boolean(payload.data?.needsImage);

      setParsedEvent(null);
      setLastCaptureDataUrl(null);
      setLastIngestSourceUrl(null);

      if (needsImage && flyerId) {
        setPendingFlyerId(flyerId);
        setShowNeedsImagePrompt(true);
        setPostFeedback({
          tone: "success",
          message: "Posted! Add a poster image so people can find your event.",
        });
        return;
      }

      setPostFeedback({ tone: "success", message: "Posted successfully!" });
      setTimeout(() => router.push("/browse"), 800);
    } catch {
      setPostFeedback({ tone: "error", message: "Posting failed. Please try again." });
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <div className="camera-view">
      <div className="camera-lens">
        <video ref={videoRef} className={`camera-feed${cameraReady ? " ready" : ""}`} playsInline muted autoPlay />
        <div className="camera-grid" />
        {cameraStatusText.trim() ? <div className="camera-status">{cameraStatusText}</div> : null}
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
      <input
        ref={posterUploadInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(event) => void onPosterFileSelected(event)}
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
      {showNeedsImagePrompt && pendingFlyerId ? (
        <div className="camera-result-card camera-needs-image-card" role="status" aria-live="polite">
          <div className="camera-result-title">Add a poster image</div>
          <p className="camera-needs-image-copy">
            Add a poster image so people can find your event.
          </p>
          <div className="camera-needs-image-actions">
            <button
              type="button"
              className="camera-result-action camera-post-btn"
              onClick={() => posterUploadInputRef.current?.click()}
              disabled={isUploadingPoster}
            >
              {isUploadingPoster ? "Uploading..." : "Upload Image"}
            </button>
            <button
              type="button"
              className="camera-result-action camera-needs-image-skip"
              onClick={skipNeedsImage}
              disabled={isUploadingPoster}
            >
              Skip
            </button>
          </div>
          {postFeedback ? (
            <div className={`camera-post-feedback camera-post-feedback--${postFeedback.tone}`} role="status">
              {postFeedback.message}
            </div>
          ) : null}
        </div>
      ) : parsedEvent ? (
        <div className="camera-result-card" role="status" aria-live="polite">
          <div className="camera-result-title">
            {isOrganiser ? "Ready to post this event?" : "Ready to add this event?"}
          </div>
          <div className="camera-result-name">{parsedEvent.title}</div>
          {isOrganiser ? (
            <>
              <button
                type="button"
                className="camera-result-action camera-post-btn"
                onClick={postToBrowse}
                disabled={isPosting}
              >
                {isPosting ? "Posting..." : "Post to Browse"}
              </button>
              {postFeedback ? (
                <div className={`camera-post-feedback camera-post-feedback--${postFeedback.tone}`} role="status">
                  {postFeedback.message}
                </div>
              ) : null}
            </>
          ) : (
            <AddToCalendarButton
              className="camera-result-action"
              onClick={() => {
                if (parsedEvent.googleCalendarUrl) {
                  window.open(parsedEvent.googleCalendarUrl, "_blank", "noopener,noreferrer");
                }
              }}
              disabled={!parsedEvent.googleCalendarUrl}
            />
          )}
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
            isLoading={isBusy && sheet === "uploads" && !parsedEvent}
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
