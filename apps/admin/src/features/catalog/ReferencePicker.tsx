"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Button } from "@slvn/ui";
import { ErrorStatus } from "@/components/QueryStatus";
import { INPUT, LABEL } from "@/components/form-styles";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { Reference } from "./schemas";

/** Số kết quả hiện mỗi lần tìm; muốn thấy mục khác thì gõ thêm từ khóa. */
const RESULT_LIMIT = 20;

export interface ReferencePickerProps {
  id: string;
  label: string;
  value: Reference[];
  onChange: (value: Reference[]) => void;
  /** Tìm theo từ khóa (rỗng = các mục đầu tiên). */
  search: (q: string, limit: number) => Promise<Reference[]>;
  queryKey: readonly unknown[];
  placeholder: string;
}

/** Chọn nhiều tác giả / văn bản pháp luật: mục đã chọn hiện thành thẻ, tìm theo từ khóa để thêm. */
export function ReferencePicker({ id, label, value, onChange, search, queryKey, placeholder }: ReferencePickerProps) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q.trim());
  const results = useQuery({
    queryKey: [...queryKey, { q: debouncedQ, limit: RESULT_LIMIT }],
    queryFn: () => search(debouncedQ, RESULT_LIMIT),
  });
  const selectedIds = new Set(value.map((item) => item.id));
  const options = (results.data ?? []).filter((item) => !selectedIds.has(item.id));

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className={LABEL}>{label}</legend>
      {value.length > 0 ? (
        <ul aria-label={`${label} đã chọn`} className="flex flex-wrap gap-2">
          {value.map((item) => (
            <li
              key={item.id}
              className="bg-surface border-border flex items-center gap-1 rounded-full border py-1 pr-1 pl-3"
            >
              <span className="text-sm">{item.label}</span>
              <button
                type="button"
                aria-label={`Bỏ ${item.label}`}
                onClick={() => onChange(value.filter((selected) => selected.id !== item.id))}
                className="text-muted hover:text-danger flex size-8 items-center justify-center rounded-full"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted text-sm">Chưa chọn mục nào.</p>
      )}

      <label htmlFor={id} className="sr-only">
        Tìm {label.toLowerCase()}
      </label>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder={placeholder}
        className={INPUT}
      />
      {results.isError ? (
        <ErrorStatus error={results.error} onRetry={() => void results.refetch()} />
      ) : results.isPending ? (
        <p role="status" className="text-muted text-sm">
          Đang tìm…
        </p>
      ) : options.length === 0 ? (
        <p className="text-muted text-sm">Không có mục phù hợp để thêm.</p>
      ) : (
        <ul aria-label={`Kết quả tìm ${label.toLowerCase()}`} className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {options.map((item) => (
            <li key={item.id}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange([...value, item])}
                className="h-auto min-h-9 w-full justify-start py-1.5 text-left"
              >
                <Plus size={16} aria-hidden="true" className="shrink-0" />
                <span>
                  <span className="sr-only">Thêm </span>
                  {item.label}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
