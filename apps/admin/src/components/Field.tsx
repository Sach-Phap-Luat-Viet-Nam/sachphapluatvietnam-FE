import type { ReactNode } from "react";
import { cn } from "@slvn/ui";
import { FIELD_ERROR, HINT, LABEL } from "./form-styles";

export interface FieldProps {
  /** `id` của ô nhập bên trong, dùng cho `htmlFor` và id của gợi ý/lỗi. */
  id: string;
  label: string;
  error?: string;
  hint?: string;
  /** Hiện "(không bắt buộc)" sau nhãn. */
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

/** Nhãn, ô nhập, gợi ý và lỗi của một field. Ô nhập dùng `fieldA11y` để nối gợi ý/lỗi cho trình đọc màn hình. */
export function Field({ id, label, error, hint, optional, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className={LABEL}>
        {label}
        {optional && <span className="text-muted font-normal"> (không bắt buộc)</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className={HINT}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className={FIELD_ERROR}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Thuộc tính a11y cho ô nhập nằm trong `Field` cùng `id`; `hasHint` khi `Field` có `hint`. */
export function fieldA11y(id: string, error?: string, hasHint = false) {
  const describedBy = [hasHint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return { id, "aria-invalid": Boolean(error), "aria-describedby": describedBy || undefined };
}
