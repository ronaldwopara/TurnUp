"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { EventItem } from "@/lib/browse-data";
import type { CaptureItem } from "@/lib/discoveries-store";

export type DiscoveryStackItem =
  | { kind: "event"; key: string; title: string; event: EventItem; savedAt: number }
  | { kind: "capture"; key: string; title: string; capture: CaptureItem; savedAt: number }
  | {
      kind: "stash";
      key: string;
      title: string;
      savedAt: number;
      stash: {
        type: "document" | "link" | "image" | "video";
        subtitle?: string | null;
        detailLabel?: string | null;
        sourceUrl?: string | null;
        thumbnailUrl?: string | null;
      };
    };

const MIN_DRAG = 50;
const MAX_VISIBLE_CARDS = 4;

function stackTransform(index: number): { x: number; y: number; rotate: number } {
  const baseRotation = 2;
  const rotationIncrement = 3;
  const offsetIncrement = -12;
  const verticalOffset = -8;
  return {
    x: index * offsetIncrement,
    y: index * verticalOffset,
    rotate: index === 0 ? 0 : -(baseRotation + index * rotationIncrement),
  };
}

function stashGlyph(type: "document" | "link" | "image" | "video") {
  switch (type) {
    case "video":
      return "VIDEO";
    case "image":
      return "FLYER";
    case "document":
      return "DOC";
    case "link":
    default:
      return "LINK";
  }
}

export function DiscoveriesStack({ items }: { items: DiscoveryStackItem[] }) {
  const itemsFingerprint = useMemo(() => items.map((it) => it.key).join("\0"), [items]);
  const totalCount = items.length;

  const [topIndex, setTopIndex] = useState(0);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setTopIndex(0);
  }, [itemsFingerprint]);

  useEffect(() => {
    if (topIndex >= totalCount) {
      setTopIndex(Math.max(0, totalCount - 1));
    }
  }, [topIndex, totalCount]);

  const deckItems = useMemo(() => items.slice(topIndex, topIndex + MAX_VISIBLE_CARDS), [items, topIndex]);
  const visibleCount = deckItems.length;

  const cycle = useCallback(() => {
    if (topIndex >= totalCount - 1) return;
    setAnimating(true);
    setTopIndex((prev) => Math.min(totalCount - 1, prev + 1));
    setTimeout(() => setAnimating(false), 300);
  }, [topIndex, totalCount]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (animating || visibleCount === 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { x: e.clientX, y: e.clientY };
      setDragOffset({ x: 0, y: 0 });
    },
    [animating, visibleCount],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    setDragOffset({ x: e.clientX - d.x, y: e.clientY - d.y });
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y);
      setDragOffset({ x: 0, y: 0 });
      if (dist >= MIN_DRAG) {
        cycle();
      }
    },
    [cycle],
  );

  if (items.length === 0) return null;
  if (visibleCount === 0) return null;
  const topItem = deckItems[0];

  return (
    <div className="discoveries-stack-wrap">
      <div
        className="discoveries-stack-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ touchAction: "none" }}
      >
        {deckItems.map((item, displayIdx) => {
          if (!item) return null;
          const isTop = displayIdx === 0;
          const z = 50 - displayIdx * 10;
          const { x, y, rotate } = stackTransform(displayIdx);
          const tx = isTop ? x + dragOffset.x : x;
          const ty = isTop ? y + dragOffset.y : y;

          return (
            <div
              key={item.key}
              className={`discoveries-stack-card${isTop ? " discoveries-stack-card--top" : ""}`}
              style={{
                zIndex: z,
                transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rotate}deg)`,
              }}
            >
              <div className="discoveries-stack-card-inner">
                {item.kind === "capture" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.capture.dataUrl} alt="" className="discoveries-stack-img" draggable={false} />
                ) : item.kind === "stash" ? (
                  <div
                    className="discoveries-stack-gradient"
                    style={{
                      background: item.stash.thumbnailUrl
                        ? "linear-gradient(0deg, rgba(8, 9, 20, 0.52), rgba(8, 9, 20, 0.52))"
                        : "linear-gradient(135deg, rgba(62, 101, 255, 0.95) 0%, rgba(144, 86, 255, 0.92) 52%, rgba(255, 99, 150, 0.88) 100%)",
                      color: "white",
                      position: "relative",
                    }}
                  >
                    {item.stash.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.stash.thumbnailUrl}
                        alt=""
                        className="discoveries-stack-img"
                        draggable={false}
                        style={{ position: "absolute", inset: 0, zIndex: 0 }}
                      />
                    ) : null}
                    <div
                      style={{
                        position: "absolute",
                        top: 16,
                        left: 16,
                        right: 16,
                        zIndex: 1,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          letterSpacing: "0.08em",
                          fontWeight: 700,
                          opacity: 0.88,
                        }}
                      >
                        {stashGlyph(item.stash.type)}
                      </span>
                      {item.stash.sourceUrl ? (
                        <span style={{ fontSize: 11, opacity: 0.75 }}>
                          {(() => {
                            try {
                              return new URL(item.stash.sourceUrl).hostname.replace(/^www\./, "");
                            } catch {
                              return "";
                            }
                          })()}
                        </span>
                      ) : null}
                    </div>
                    {(item.stash.subtitle || item.stash.detailLabel) && (
                      <div
                        style={{
                          position: "absolute",
                          left: 16,
                          right: 16,
                          bottom: 14,
                          zIndex: 1,
                          fontSize: 12,
                          opacity: 0.82,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.stash.subtitle ?? item.stash.detailLabel}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="discoveries-stack-gradient"
                    style={{
                      background: `linear-gradient(135deg, ${item.event.color} 0%, ${item.event.accent}33 100%)`,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="discoveries-stack-title">{topItem?.title ?? ""}</p>
      {totalCount > 1 && <p className="discoveries-stack-hint">Swipe the top card to see the next</p>}
      <div className="discoveries-stack-pager">
        <button
          type="button"
          className="discoveries-stack-pager-btn"
          disabled={topIndex <= 0}
          onClick={() => setTopIndex((p) => Math.max(0, p - 1))}
          aria-label="Previous discovery"
        >
          ‹
        </button>
        <span className="discoveries-stack-pager-label">
          {Math.min(topIndex + 1, totalCount)} / {totalCount}
        </span>
        <button
          type="button"
          className="discoveries-stack-pager-btn"
          disabled={topIndex >= totalCount - 1}
          onClick={() => setTopIndex((p) => Math.min(totalCount - 1, p + 1))}
          aria-label="Next discovery"
        >
          ›
        </button>
      </div>
    </div>
  );
}
