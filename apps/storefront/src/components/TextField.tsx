import type { InputHTMLAttributes } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { cn } from "@slvn/ui";
import { INPUT, LABEL } from "@/components/form-styles";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  /** Kết quả `register(...)` của React Hook Form. */
  registration: UseFormRegisterReturn;
  error?: string;
}

/** Ô nhập có nhãn và lỗi theo field (gắn `aria-invalid`, `aria-describedby`), dùng cho các form React Hook Form. */
export function TextField({ id, label, registration, error, className, ...props }: TextFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        {...props}
        {...registration}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(INPUT, "border-border")}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
