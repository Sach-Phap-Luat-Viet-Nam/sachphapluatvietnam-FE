"use client";

import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { ArrowRight } from "lucide-react";
import type { CatalogParams } from "./catalog";
import { SORT_LABELS, param } from "./catalog";

export interface SortFormProps {
  params: CatalogParams;
}

const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

/**
 * Chọn kiểu sắp xếp là áp dụng ngay (form GET `/sach`). Đổi bằng phím mũi tên trên ô đang đóng cũng bắn `change` ở mỗi
 * lần bấm, nên với bàn phím chỉ gửi khi nhấn Enter hoặc rời ô; không bật JS thì dùng nút áp dụng trong `<noscript>`.
 */
export function SortForm({ params }: SortFormProps) {
  const form = useRef<HTMLFormElement>(null);
  const pendingKeyboardChange = useRef(false);

  function submit() {
    pendingKeyboardChange.current = false;
    form.current?.requestSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLSelectElement>) {
    if (ARROW_KEYS.has(event.key)) {
      pendingKeyboardChange.current = true;
    } else if (event.key === "Enter" && pendingKeyboardChange.current) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form ref={form} action="/sach" className="flex items-center gap-2">
      {Object.entries(params)
        .filter(([key, value]) => key !== "sort" && key !== "page" && typeof value === "string" && value)
        .map(([key]) => (
          <input key={key} type="hidden" name={key} value={param(params, key)} />
        ))}
      <label htmlFor="sort" className="text-mist hidden text-sm sm:block">
        Sắp xếp
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={Object.hasOwn(SORT_LABELS, param(params, "sort")) ? param(params, "sort") : "newest"}
        onChange={() => {
          if (!pendingKeyboardChange.current) submit();
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (pendingKeyboardChange.current) submit();
        }}
        className="border-border bg-ink-deep text-ivory h-11 min-w-0 flex-1 border px-3 text-[15px] sm:w-52 sm:flex-none"
      >
        {Object.entries(SORT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <noscript>
        <button
          type="submit"
          aria-label="Áp dụng sắp xếp"
          className="border-gold text-gold flex size-11 shrink-0 items-center justify-center border"
        >
          <ArrowRight size={18} />
        </button>
      </noscript>
    </form>
  );
}
