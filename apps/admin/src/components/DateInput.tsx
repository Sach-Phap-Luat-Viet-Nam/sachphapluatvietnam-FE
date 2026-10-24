"use client";

import { useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@slvn/ui";
import { DATE_DISPLAY_LENGTH, dateToDisplay, displayToDate, isRealDate, maskDate } from "@/lib/vn-date";
import { INPUT } from "./form-styles";

export interface DateInputProps {
  id: string;
  /** Giá trị của form: `YYYY-MM-DD` hoặc `""`; chuỗi đang gõ dở thì để schema báo lỗi. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * Ô nhập ngày theo `dd/mm/yyyy`. `<input type="date">` hiện theo ngôn ngữ của máy nên dùng ô chữ có tự thêm `/` khi
 * gõ, kèm nút lịch mở bộ chọn của trình duyệt (giống `DateTimeInput`).
 */
export function DateInput({ id, value, onChange, onBlur, invalid, describedBy }: DateInputProps) {
  const [text, setText] = useState(() => dateToDisplay(value));
  const picker = useRef<HTMLInputElement>(null);

  // Giá trị đổi từ bên ngoài (đặt lại form, chọn từ lịch) thì hiển thị theo giá trị đó; đang gõ dở thì giữ nguyên.
  if (value !== displayToDate(text)) {
    setText(dateToDisplay(value));
  }

  const type = (raw: string) => {
    const masked = maskDate(raw);
    setText(masked);
    onChange(displayToDate(masked));
  };

  const openPicker = () => {
    const input = picker.current;
    if (input && typeof input.showPicker === "function") {
      input.showPicker();
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/yyyy"
        maxLength={DATE_DISPLAY_LENGTH}
        value={text}
        onChange={(event) => type(event.target.value)}
        onBlur={onBlur}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={cn(INPUT, "pr-14 tabular-nums")}
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="Chọn ngày từ lịch"
        className="text-muted hover:text-foreground absolute top-1 right-1 flex size-10 items-center justify-center"
      >
        <CalendarDays size={20} aria-hidden="true" />
      </button>
      {/* Chỉ để mở bộ chọn của trình duyệt; giá trị chọn xong đổ về ô chữ ở trên. */}
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={isRealDate(value) ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute right-0 bottom-0 size-px opacity-0"
      />
    </div>
  );
}
