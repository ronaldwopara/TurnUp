"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { EventItem } from "@/lib/browse-data";
import type { CaptureItem } from "@/lib/discoveries-store";

export type DiscoveryStackItem =
  | { kind: "event"; key: string; title: string; event: EventItem }
  | { kind: "capture"; key: string; title: string; capture: CaptureItem };

const MIN_DRAG = 50;
const MAX_CARDS_PER_DECK = 6;

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

export function DiscoveriesStack({ items }: { items: DiscoveryStackItem[] }) {
  const itemsFingerprint = useMemo(() => items.map((it) => it.key).join("\0"), [items]);
  const totalPages = Math.max(1, Math.ceil(items.length / MAX_CARDS_PER_DECK));

  const [page, setPage] = useState(0);
  const [topIndex, setTopIndex] = useState(0);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setPage(0);
    setTopIndex(0);
  }, [itemsFingerprint]);

  useEffect(() => {
    setTopIndex(0);
  }, [page]);

  const deckItems = useMemo(
    () => items.slice(page * MAX_CARDS_PER_DECK, page * MAX_CARDS_PER_DECK + MAX_CARDS_PER_DECK),
    [items, page],
  );

  const count = deckItems.length;

  const cycle = useCallback(() => {
    if (count < 2) return;
    setAnimating(true);
    setTopIndex((prev) => (prev + 1) % count);
    setTimeout(() => setAnimating(false), 300);
  }, [count]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (animating || count === 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { x: e.clientX, y: e.clientY };
      setDragOffset({ x: 0, y: 0 });
    },
    [animating, count],
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
  if (count === 0) return null;

  const displayOrder: number[] = [];
  for (let i = 0; i < count; i++) {
    displayOrder.push((topIndex + i) % count);
  }

  const topItem = deckItems[displayOrder[0]];

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
        {displayOrder.map((itemIdx, displayIdx) => {
          const item = deckItems[itemIdx];
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
      {count > 1 && <p className="discoveries-stack-hint">Swipe the top card to see the next</p>}
      {totalPages > 1 && (
        <div className="discoveries-stack-pager">
          <button
            type="button"
            className="discoveries-stack-pager-btn"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label="Previous six discoveries"
          >
            ‹
          </button>
          <span className="discoveries-stack-pager-label">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            className="discoveries-stack-pager-btn"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Next six discoveries"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
