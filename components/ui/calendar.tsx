"use client";

import { DayPicker } from "react-day-picker";
import type { DayPickerProps } from "react-day-picker";

import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

export function Calendar({ className, ...props }: DayPickerProps) {
  return <DayPicker className={cn(className)} {...props} />;
}
