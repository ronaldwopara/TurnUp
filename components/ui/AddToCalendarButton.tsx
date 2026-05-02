"use client";

import type { MouseEventHandler } from "react";

const GOOGLE_CALENDAR_FAVICON =
  "https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_1_2x.png";

type AddToCalendarButtonProps = {
  className?: string;
  label?: string;
  disabled?: boolean;
  stopPropagation?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function AddToCalendarButton({
  className,
  label = "Add to Calendar",
  disabled,
  stopPropagation = false,
  onClick,
}: AddToCalendarButtonProps) {
  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      aria-label={label}
      onClick={(event) => {
        if (stopPropagation) {
          event.stopPropagation();
        }
        onClick?.(event);
      }}
    >
      <img
        src={GOOGLE_CALENDAR_FAVICON}
        alt=""
        className="card-cal-favicon"
        width={18}
        height={18}
        decoding="async"
      />
      {label}
    </button>
  );
}
