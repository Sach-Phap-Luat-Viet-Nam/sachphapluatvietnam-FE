"use client";

import { useState } from "react";
import { Button } from "@slvn/ui";
import { PROVINCES } from "@slvn/utils";
import { CHECKBOX, HINT, INPUT } from "@/components/form-styles";

export interface ProvincePickerProps {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  /** Tỉnh đã thuộc vùng khác → tên vùng đó (mỗi tỉnh chỉ thuộc một vùng). */
  takenBy: ReadonlyMap<string, string>;
  invalid?: boolean;
  describedBy?: string;
}

/** Chọn nhiều tỉnh/thành từ danh sách 34 tỉnh; tỉnh của vùng khác bị khóa, tỉnh lạ đã lưu từ trước vẫn hiện để bỏ chọn. */
export function ProvincePicker({ id, value, onChange, takenBy, invalid, describedBy }: ProvincePickerProps) {
  const [filter, setFilter] = useState("");
  const known = new Set<string>(PROVINCES);
  const options = [...PROVINCES, ...value.filter((name) => !known.has(name))];
  const needle = filter.trim().toLocaleLowerCase("vi");
  const visible = options.filter((name) => name.toLocaleLowerCase("vi").includes(needle));
  const available = options.filter((name) => !takenBy.has(name));

  const toggle = (name: string, checked: boolean) =>
    onChange(checked ? [...value, name] : value.filter((item) => item !== name));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          id={id}
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Lọc tỉnh/thành"
          aria-label="Lọc tỉnh/thành"
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={`${INPUT} max-w-xs`}
        />
        <Button variant="outline" size="sm" onClick={() => onChange(available)}>
          Chọn tất cả còn trống
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onChange([])}>
          Bỏ chọn
        </Button>
        <span className={HINT} aria-live="polite">
          Đã chọn {value.length}
        </span>
      </div>
      <ul className="border-border grid max-h-72 gap-x-4 overflow-y-auto rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((name) => {
          const owner = takenBy.get(name);
          return (
            <li key={name}>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  className={CHECKBOX}
                  checked={value.includes(name)}
                  disabled={owner !== undefined}
                  onChange={(event) => toggle(name, event.target.checked)}
                />
                <span className={owner ? "text-muted" : undefined}>
                  {name}
                  {owner && <span className="block text-xs">Thuộc vùng “{owner}”</span>}
                </span>
              </label>
            </li>
          );
        })}
        {visible.length === 0 && <li className="text-muted py-2">Không có tỉnh nào khớp.</li>}
      </ul>
    </div>
  );
}
