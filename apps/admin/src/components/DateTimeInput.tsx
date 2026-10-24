"use client";

import { useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@slvn/ui";
import { DISPLAY_LENGTH, displayToInternal, internalToDisplay, maskDateTime } from "@/lib/vn-datetime";
import { INPUT } from "./form-styles";

const INTERNAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export interface DateTimeInputProps {
  id: string;
  /** Giá trị của form: `YYYY-MM-DDTHH:mm` (giờ Việt Nam) hoặc `""`; chuỗi đang gõ dở thì để schema báo lỗi. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * Ô nhập ngày giờ theo `dd/mm/yyyy hh:mm` (24 giờ). `<input type="datetime-local">` hiện theo ngôn ngữ của máy
 * (`mm/dd/yyyy` ở máy tiếng Anh) và không đổi được, nên ô này là ô chữ có tự thêm dấu phân cách khi gõ, kèm nút lịch mở
 * bộ chọn của trình duyệt để chọn bằng chuột.
 */
export function DateTimeInput({ id, value, onChange, onBlur, invalid, describedBy }: DateTimeInputProps) {
  const [text, setText] = useState(() => internalToDisplay(value));
  const picker = useRef<HTMLInputElement>(null);

  // Giá trị đổi từ bên ngoài (đặt lại form, chọn từ lịch) thì hiển thị theo giá trị đó; đang gõ dở thì giữ nguyên.
  if (value !== displayToInternal(text)) {
    setText(internalToDisplay(value));
  }

  const type = (raw: string) => {
    const masked = maskDateTime(raw);
    setText(masked);
    onChange(displayToInternal(masked));
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
        placeholder="dd/mm/yyyy hh:mm"
        maxLength={DISPLAY_LENGTH}
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
        aria-label="Chọn ngày giờ từ lịch"
        className="text-muted hover:text-foreground absolute top-1 right-1 flex size-10 items-center justify-center"
      >
        <CalendarDays size={20} aria-hidden="true" />
      </button>
      {/* Chỉ để mở bộ chọn của trình duyệt; giá trị chọn xong đổ về ô chữ ở trên. */}
      <input
        ref={picker}
        type="datetime-local"
        tabIndex={-1}
        aria-hidden="true"
        value={INTERNAL_PATTERN.test(value) ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute right-0 bottom-0 size-px opacity-0"
      />
    </div>
  );
}
