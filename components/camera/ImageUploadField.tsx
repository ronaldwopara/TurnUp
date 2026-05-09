"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

function IconUploadCloud({ className }: { className?: string }) {
  return (
    <svg className={className} width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 18a4 4 0 0 1-2.24-7.33A5 5 0 0 1 15 9a4 4 0 0 1 2.52 7.11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 15v7M9 16l3-3 3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconAlertCircle({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

/** Picker hint + validation — still enforced in handleFileChange (MIME + extension). */
const ACCEPT_IMAGES_ONLY =
  "image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif,image/bmp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.bmp,.svg";

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp|svg)$/i.test(file.name);
}

export interface ImageUploadFieldProps {
  value?: File | string | null;
  onChange?: (value: File | string | null) => void;
  onBlur?: () => void;
  onCaptureSave?: (dataUrl: string) => void;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  aspectRatio?: number;
  defaultImage?: string;
  isLoading?: boolean;
  maxSize?: number;
}

export function ImageUploadField({
  value,
  onChange,
  onBlur,
  onCaptureSave,
  className,
  disabled = false,
  error = false,
  aspectRatio = 1,
  defaultImage,
  isLoading = false,
  maxSize = 4 * 1024 * 1024,
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formatReject, setFormatReject] = useState(false);

  const onCaptureSaveRef = useRef(onCaptureSave);
  onCaptureSaveRef.current = onCaptureSave;
  const processedFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (typeof value === "string") {
      setPreviewUrl(value);
      processedFileRef.current = null;
    } else if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      
      if (processedFileRef.current !== value && onCaptureSaveRef.current) {
        processedFileRef.current = value;
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string" && onCaptureSaveRef.current) {
            onCaptureSaveRef.current(reader.result);
          }
        };
        reader.readAsDataURL(value);
      }
      
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(defaultImage || null);
      processedFileRef.current = null;
    }
  }, [value, defaultImage]);

  useEffect(() => {
    if (value == null) setFormatReject(false);
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      setFormatReject(true);
      input.value = "";
      return;
    }

    setFormatReject(false);

    if (!file.size) {
      input.value = "";
      return;
    }

    onChange?.(file);
    onBlur?.();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFormatReject(false);
    onChange?.(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (isLoading) {
    return (
      <div
        className={cn("sheet-upload-skeleton", className)}
        style={{ aspectRatio }}
        aria-busy
      />
    );
  }

  return (
    <div className={cn("sheet-upload-field-root", className)}>
      <input
        type="file"
        accept={ACCEPT_IMAGES_ONLY}
        multiple={false}
        className="sheet-upload-field-input"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={disabled}
        aria-invalid={error || formatReject}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={cn(
          "sheet-upload-field-zone",
          (error || formatReject) && "sheet-upload-field-zone--error",
          disabled && "sheet-upload-field-zone--disabled",
          previewUrl && "sheet-upload-field-zone--filled",
        )}
        style={{ aspectRatio }}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- blob/data URLs */}
            <img src={previewUrl} alt="" className="sheet-upload-field-preview" />

            {!disabled && (
              <div className="sheet-upload-field-hover" aria-hidden>
                <IconUploadCloud className="sheet-upload-field-hover-icon" />
              </div>
            )}

            {!disabled && (
              <button
                type="button"
                className="sheet-upload-field-remove"
                onClick={handleRemove}
                aria-label="Remove image"
              >
                <IconX className="sheet-upload-field-remove-icon" />
              </button>
            )}
          </>
        ) : (
          <div className="sheet-upload-field-empty">
            <IconUploadCloud className="sheet-upload-field-empty-icon" />
            <div className="sheet-upload-field-copy">
              <p className="sheet-upload-field-title">Tap to upload</p>
              <p className="sheet-upload-field-sub">
                {maxSize
                  ? `One image · Max ${maxSize / 1024 / 1024} MB · JPG, PNG, WebP…`
                  : "One image · JPG, PNG, WebP…"}
              </p>
            </div>
          </div>
        )}

        {(error || formatReject) && (
          <div className="sheet-upload-field-error-badge">
            <IconAlertCircle className="sheet-upload-field-error-icon" />
            {formatReject ? "Images only (one file)" : "Invalid image"}
          </div>
        )}
      </div>
    </div>
  );
}
