"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageUp } from "lucide-react";
import { buttonClassName, cn } from "@slvn/ui";
import { adminErrorMessage } from "@/lib/admin-errors";
import { ImageUploadError, optimizedImageUrl, uploadImage } from "@/lib/image-upload";
import type { UploadTarget } from "@/lib/image-upload";
import { fieldA11y } from "./Field";
import { FIELD_ERROR, HINT, INPUT, LABEL } from "./form-styles";

const PREVIEW = {
  // Ảnh bìa tỷ lệ 3:4.
  cover: { width: 150, height: 200, className: "h-50 w-37.5" },
  popup: { width: 240, height: 240, className: "size-60" },
} as const;

export interface ImageFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  target: UploadTarget;
  /** Mô tả ảnh cho bản xem trước. */
  alt: string;
  error?: string;
  optional?: boolean;
}

/** Chọn ảnh từ máy để upload lên Cloudinary, hoặc dán link ảnh có sẵn. Có bản xem trước. */
export function ImageField({ id, label, value, onChange, target, alt, error, optional }: ImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const preview = PREVIEW[target];
  const urlId = `${id}-url`;
  const hint = "Ảnh JPG, PNG hoặc WebP, tối đa 10 MB.";

  const onFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      onChange(await uploadImage(file, target));
    } catch (caught) {
      setUploadError(caught instanceof ImageUploadError ? caught.message : adminErrorMessage(caught));
    } finally {
      setUploading(false);
    }
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className={LABEL}>
        {label}
        {optional && <span className="text-muted font-normal"> (không bắt buộc)</span>}
      </legend>
      <div className="flex flex-wrap items-start gap-4">
        <div
          className={cn(
            "bg-surface border-border flex shrink-0 items-center justify-center overflow-hidden rounded-md border",
            preview.className,
          )}
        >
          {value ? (
            // `unoptimized`: link có thể ở bất kỳ host nào khi backend chưa cấu hình Cloudinary.
            <Image
              src={optimizedImageUrl(value)}
              alt={alt}
              width={preview.width}
              height={preview.height}
              unoptimized
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-muted px-3 text-center text-sm">Chưa có ảnh</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <label htmlFor={id} className={buttonClassName({ variant: "outline", className: "w-fit" })}>
            <ImageUp size={18} aria-hidden="true" />
            {uploading ? "Đang tải ảnh lên…" : "Chọn ảnh từ máy"}
          </label>
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(event) => {
              void onFile(event.target.files?.[0]);
              // Cho phép chọn lại cùng file sau khi lỗi.
              event.target.value = "";
            }}
            aria-describedby={`${id}-hint`}
            className="sr-only"
          />
          <p id={`${id}-hint`} className={HINT}>
            {hint}
          </p>
          {uploading && (
            <p role="status" className="text-muted text-sm">
              Đang tải ảnh lên…
            </p>
          )}
          {uploadError && (
            <p role="alert" className={FIELD_ERROR}>
              {uploadError}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <label htmlFor={urlId} className="text-sm font-medium">
              Hoặc dán link ảnh
            </label>
            <input
              type="url"
              inputMode="url"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="https://res.cloudinary.com/…"
              {...fieldA11y(urlId, error)}
              className={INPUT}
            />
            {error && (
              <p id={`${urlId}-error`} role="alert" className={FIELD_ERROR}>
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </fieldset>
  );
}
