"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

import { AddToCalendarButton } from "@/components/ui/AddToCalendarButton";
import { layoutIdForBrowseEvent, type BrowseEventDetail } from "@/lib/browse-event-detail";
import { getDisplayImageCandidates } from "@/lib/image-display";
import { isEventLiked, toggleLikedEvent } from "@/lib/discoveries-store";

function BackIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 8 14" fill="none" aria-hidden>
      <path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "#ef4444" : "none"} aria-hidden>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        stroke={filled ? "#ef4444" : "white"}
        strokeWidth="1.8"
      />
    </svg>
  );
}

function getSocialEmbedUrl(sourceUrl?: string | null): { embedUrl: string; provider: "instagram" | "tiktok" } | null {
  if (!sourceUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname;

  // Instagram: /p/{shortcode} or /reel/{shortcode}
  if (host.includes("instagram.com")) {
    const m = path.match(/^\/(p|reel)\/([^/?#]+)/i);
    if (!m) return null;
    const kind = m[1].toLowerCase();
    const shortcode = m[2];

    if (kind === "p") {
      return { provider: "instagram", embedUrl: `https://www.instagram.com/p/${shortcode}/embed/captioned/` };
    }
    return { provider: "instagram", embedUrl: `https://www.instagram.com/reel/${shortcode}/embed/` };
  }

  // TikTok: /@user/video/{id}
  if (host.includes("tiktok.com")) {
    const m = path.match(/^\/@[^/]+\/video\/([^/?#]+)/i);
    if (!m) return null;
    const videoId = m[1];
    return { provider: "tiktok", embedUrl: `https://www.tiktok.com/embed/v2/${videoId}` };
  }

  return null;
}

type EventDetailDialogProps = {
  detail: BrowseEventDetail | null;
  onClose: () => void;
  onFlyerSave?: (flyerId: string) => void;
};

export function EventDetailDialog({ detail, onClose, onFlyerSave }: EventDetailDialogProps) {
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | undefined>();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [imgIx, setImgIx] = useState(0);
  const [posterFailed, setPosterFailed] = useState(false);

  const embedInfo = useMemo(() => getSocialEmbedUrl(detail?.sourceUrl), [detail?.sourceUrl]);
  const [embedFailed, setEmbedFailed] = useState(false);
  const embedTimeoutRef = useRef<number | null>(null);
  const embedAttemptIdRef = useRef(0);

  const layoutId = detail ? layoutIdForBrowseEvent(detail.id) : undefined;
  const posterCandidates = useMemo(
    () => getDisplayImageCandidates(resolvedImageUrl ?? detail?.imageUrl, detail?.flyerId),
    [resolvedImageUrl, detail?.imageUrl, detail?.flyerId],
  );
  const posterUrl = posterCandidates[imgIx];
  const showPoster = Boolean(posterUrl) && !posterFailed;

  useEffect(() => {
    if (!detail) {
      setResolvedImageUrl(undefined);
      setPreviewLoading(false);
      setImgIx(0);
      setPosterFailed(false);
      setEmbedFailed(false);
      return;
    }

    setResolvedImageUrl(detail.imageUrl);
    setLiked(detail.catalogId != null ? isEventLiked(detail.catalogId) : false);
    setImgIx(0);
    setPosterFailed(false);
    setEmbedFailed(false);

    if (detail.flyerId || detail.imageUrl || !detail.sourceUrl) {
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    void (async () => {
      try {
        const response = await fetch("/api/link-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: detail.sourceUrl }),
        });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as {
          data?: { imageUrl?: string; faviconUrl?: string };
        };
        if (cancelled) return;
        const nextUrl = payload.data?.imageUrl ?? payload.data?.faviconUrl;
        setResolvedImageUrl(nextUrl);
      } catch {
        // keep gradient placeholder
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detail]);

  // Hide the embed if it doesn't load (private/blocked posts, iframe blocked by the platform, etc.).
  useEffect(() => {
    setEmbedFailed(false);
    if (!embedInfo?.embedUrl) return;

    embedAttemptIdRef.current += 1;
    const attemptId = embedAttemptIdRef.current;

    if (embedTimeoutRef.current != null) {
      window.clearTimeout(embedTimeoutRef.current);
      embedTimeoutRef.current = null;
    }

    embedTimeoutRef.current = window.setTimeout(() => {
      if (embedAttemptIdRef.current !== attemptId) return;
      setEmbedFailed(true);
    }, 8000);

    return () => {
      if (embedTimeoutRef.current != null) {
        window.clearTimeout(embedTimeoutRef.current);
        embedTimeoutRef.current = null;
      }
    };
  }, [embedInfo?.embedUrl]);

  useEffect(() => {
    if (!detail) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detail, onClose]);

  const handleHeart = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (detail?.catalogId != null) {
        setLiked(toggleLikedEvent(detail.catalogId));
        return;
      }
      if (detail?.flyerId && onFlyerSave) {
        onFlyerSave(detail.flyerId);
      }
    },
    [detail, onFlyerSave],
  );

  const resolvedCalendarUrl =
    detail?.calendarUrl ??
    (detail?.title
      ? `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(detail.title)}`
      : undefined);

  const showMeta = Boolean(detail?.priceLabel || detail?.dateLabel);

  return (
    <AnimatePresence>
      {detail ? (
        <>
          <motion.button
            type="button"
            className="event-detail-overlay"
            aria-label="Close event details"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <div className="event-detail-shell">
            <button type="button" className="event-detail-back" aria-label="Back" onClick={onClose}>
              <BackIcon />
            </button>

            <motion.div
              className="event-detail-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="event-detail-title"
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div className="event-detail-poster-wrap" layout>
                <motion.div
                  className="event-detail-poster"
                  layoutId={layoutId}
                  style={{
                    background: showPoster
                      ? "#0a0a0a"
                      : `linear-gradient(135deg, ${detail.color} 0%, ${detail.accent}55 100%)`,
                  }}
                >
                  {showPoster ? (
                    <img
                      src={posterUrl}
                      alt=""
                      className="event-detail-poster-img"
                      draggable={false}
                      onError={() => {
                        if (imgIx + 1 < posterCandidates.length) {
                          setImgIx((i) => i + 1);
                        } else {
                          setPosterFailed(true);
                        }
                      }}
                    />
                  ) : null}
                  {previewLoading ? <div className="event-detail-poster-loading">Loading preview…</div> : null}
                </motion.div>
              </motion.div>

              <div className="event-detail-body">
                {detail.tag ? <span className="event-detail-tag">{detail.tag}</span> : null}
                <h2 id="event-detail-title" className="event-detail-title">
                  {detail.title}
                </h2>
                {showMeta ? (
                  <div className="event-detail-meta">
                    {detail.priceLabel ? <span>{detail.priceLabel}</span> : null}
                    {detail.priceLabel && detail.dateLabel ? (
                      <span className="event-detail-meta-dot" aria-hidden>
                        ·
                      </span>
                    ) : null}
                    {detail.dateLabel ? <span>{detail.dateLabel}</span> : null}
                  </div>
                ) : null}
                {detail.postedBy ? <p className="event-detail-byline">Posted by {detail.postedBy}</p> : null}
                {detail.location ? <p className="event-detail-location">{detail.location}</p> : null}
                {detail.description ? <p className="event-detail-description">{detail.description}</p> : null}

                {embedInfo?.embedUrl && !embedFailed ? (
                  <div className="event-detail-embed" aria-label={`${embedInfo.provider} embedded post`}>
                    <iframe
                      className="event-detail-embed-iframe"
                      title={`${embedInfo.provider} embedded post`}
                      src={embedInfo.embedUrl}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      sandbox="allow-scripts allow-same-origin allow-popups"
                      onLoad={() => {
                        // Some iframe failures still call onLoad; keep a timeout fallback for reliability.
                        if (embedTimeoutRef.current != null) {
                          window.clearTimeout(embedTimeoutRef.current);
                          embedTimeoutRef.current = null;
                        }
                      }}
                      onError={() => {
                        setEmbedFailed(true);
                        if (embedTimeoutRef.current != null) {
                          window.clearTimeout(embedTimeoutRef.current);
                          embedTimeoutRef.current = null;
                        }
                      }}
                    />
                  </div>
                ) : null}

                {detail.amenities && detail.amenities.length > 0 ? (
                  <div className="event-detail-amenities">
                    {detail.amenities.map((label) => (
                      <span key={label} className="event-detail-amenity">
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
                {detail.sourceUrl ? (
                  <a
                    href={detail.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="event-detail-source-link"
                  >
                    View original post
                  </a>
                ) : null}

                <div className="event-detail-actions">
                  <button
                    type="button"
                    className="event-detail-heart-btn"
                    aria-label={liked ? "Unlike" : "Like"}
                    aria-pressed={liked}
                    onClick={handleHeart}
                  >
                    <HeartIcon filled={liked} />
                  </button>
                  <AddToCalendarButton
                    className="event-detail-cal-pill"
                    label="Add to Google Calendar"
                    stopPropagation
                    onClick={() => window.open(resolvedCalendarUrl, "_blank", "noopener,noreferrer")}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
