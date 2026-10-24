"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button, buttonClassName } from "@slvn/ui";
import type { ButtonVariant } from "@slvn/ui";

export interface ConfirmButtonProps {
  children: ReactNode;
  /** Câu hỏi xác nhận, ví dụ "Xóa danh mục Dân sự?". */
  question: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  variant?: ButtonVariant;
  /** Màu nút xác nhận; mặc định `danger` cho thao tác xóa/ẩn. */
  confirmVariant?: ButtonVariant;
}

/** Nút cho thao tác khó quay lại (xóa, ẩn): bấm lần đầu hiện câu hỏi và nút xác nhận ngay tại chỗ. */
export function ConfirmButton({
  children,
  question,
  confirmLabel,
  onConfirm,
  pending,
  variant,
  confirmVariant = "danger",
}: ConfirmButtonProps) {
  const [asking, setAsking] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (asking) {
      confirmRef.current?.focus();
    }
  }, [asking]);

  if (!asking) {
    return (
      <Button variant={variant ?? "outline"} size="sm" disabled={pending} onClick={() => setAsking(true)}>
        {children}
      </Button>
    );
  }
  return (
    <span role="group" aria-label={question} className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">{question}</span>
      {/* Thẻ `button` thường vì `Button` không nhận `ref` (cần ref để đưa focus tới nút xác nhận). */}
      <button
        ref={confirmRef}
        type="button"
        disabled={pending}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
        className={buttonClassName({ variant: confirmVariant, size: "sm" })}
      >
        {confirmLabel}
      </button>
      <Button variant="ghost" size="sm" onClick={() => setAsking(false)}>
        Hủy
      </Button>
    </span>
  );
}
