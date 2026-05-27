"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { getDisplayImageCandidates } from "@/lib/image-display";

type EventPosterImageProps = {
  imageUrl?: string | null;
  flyerId?: string;
  color: string;
  accent: string;
  layoutId?: string;
  className?: string;
  imgClassName?: string;
  maxHeight?: string;
};

export function EventPosterImage({
  imageUrl,
  flyerId,
  color,
  accent,
  layoutId,
  className = "card-image-thumb",
  imgClassName = "card-image-flyer",
  maxHeight,
}: EventPosterImageProps) {
  const [failed, setFailed] = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);

  const candidates = useMemo(() => getDisplayImageCandidates(imageUrl, flyerId), [imageUrl, flyerId]);
  const hasPhoto = Boolean((imageUrl?.trim() || flyerId) && !failed && candidates.length > 0);
  const thumbClass = hasPhoto ? `${className} card-image-thumb--photo` : `${className} card-image-placeholder`;

  const gradientStyle = {
    background: `linear-gradient(135deg, ${color} 0%, ${accent}22 100%)`,
  };

  return (
    <motion.div
      className={thumbClass}
      layoutId={layoutId}
      style={hasPhoto ? (maxHeight ? { maxHeight } : undefined) : gradientStyle}
    >
      {hasPhoto ? (
        <img
          src={candidates[srcIndex]}
          alt=""
          className={imgClassName}
          draggable={false}
          style={maxHeight ? { maxHeight } : undefined}
          onError={() => {
            if (srcIndex + 1 < candidates.length) {
              setSrcIndex((i) => i + 1);
            } else {
              setFailed(true);
            }
          }}
        />
      ) : null}
    </motion.div>
  );
}
