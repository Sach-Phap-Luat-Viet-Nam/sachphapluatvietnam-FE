"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { Button, cn } from "@slvn/ui";
import { ErrorStatus } from "@/components/QueryStatus";
import { HINT, INPUT } from "@/components/form-styles";
import { enumLabel } from "@/lib/enum-label";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { inventoryKeys, searchSkus } from "./api";
import { COVER_TYPE_LABELS, skuLabel } from "./labels";
import type { SkuOption, SkuSearchResult } from "./schemas";

const MIN_QUERY_LENGTH = 2;
/** 404 ở đây nghĩa là backend đang chạy chưa có API tìm SKU (chưa cập nhật), không phải "không có kết quả". */
const SEARCH_UNAVAILABLE = {
  NOT_FOUND: "Máy chủ chưa có chức năng tìm SKU. Nhờ quản trị viên cập nhật backend rồi thử lại.",
};
const OPTION =
  "border-border hover:border-primary hover:bg-primary/5 focus-visible:border-primary flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors";

export interface SkuPickerProps {
  /** `id` của ô tìm, dùng cho `htmlFor` của nhãn bên ngoài. */
  id: string;
  value: SkuOption | null;
  onChange: (value: SkuOption | null) => void;
  invalid?: boolean;
  describedBy?: string;
}

/** Nhãn hiển thị của một SKU: tên sách · ấn bản · loại bìa · mã SKU. */
export function skuOptionLabel(sku: SkuSearchResult): string {
  return skuLabel(sku);
}

/**
 * Chọn SKU trong một bước: gõ một phần tên sách, mã SKU hoặc ISBN, kết quả là SKU (kèm tồn kho) để bấm chọn luôn.
 * Enter chọn kết quả đầu tiên (gõ đúng mã SKU/ISBN rồi Enter là xong), mũi tên xuống chuyển vào danh sách.
 */
export function SkuPicker({ id, value, onChange, invalid, describedBy }: SkuPickerProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim());
  const enabled = debounced.length >= MIN_QUERY_LENGTH;
  const skus = useQuery({
    queryKey: inventoryKeys.skuSearch(debounced),
    queryFn: () => searchSkus(debounced),
    enabled,
  });

  if (value) {
    return (
      <div
        className={cn(
          "bg-background flex min-h-12 items-center justify-between gap-3 rounded-md border px-3.5 py-2",
          invalid ? "border-danger" : "border-border",
        )}
      >
        <span className="font-medium">{value.label}</span>
        {/* Nhãn bên ngoài trỏ tới nút này để bấm nhãn vẫn đưa focus vào ô đang chọn. */}
        <Button id={id} variant="ghost" size="sm" onClick={() => onChange(null)} aria-label={`Đổi SKU ${value.label}`}>
          <X size={16} aria-hidden="true" /> Đổi
        </Button>
      </div>
    );
  }

  const select = (sku: SkuSearchResult) => {
    onChange({ id: sku.skuId, label: skuOptionLabel(sku) });
    setQuery("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      // Không để Enter gửi cả form phiếu nhập khi người dùng chỉ đang tìm SKU.
      event.preventDefault();
      const term = query.trim();
      if (term.length >= MIN_QUERY_LENGTH) {
        // Hỏi theo đúng chuỗi đang gõ (không đợi debounce) để Enter không chọn nhầm kết quả của chuỗi cũ.
        void queryClient
          .fetchQuery({ queryKey: inventoryKeys.skuSearch(term), queryFn: () => searchSkus(term), staleTime: 30_000 })
          .then((results) => {
            const first = results[0];
            if (first) select(first);
          });
      }
    } else if (event.key === "ArrowDown" && skus.data?.length) {
      event.preventDefault();
      event.currentTarget.closest("[data-sku-picker]")?.querySelector<HTMLButtonElement>("ul button")?.focus();
    }
  };

  return (
    <div data-sku-picker className="flex flex-col gap-3">
      <div className="relative">
        <Search
          size={18}
          aria-hidden="true"
          className="text-muted pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
        />
        <input
          id={id}
          type="search"
          autoComplete="off"
          placeholder="Gõ tên sách, mã SKU hoặc ISBN…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={cn(INPUT, "pl-10")}
        />
      </div>
      {!enabled ? (
        <p className={HINT}>Gõ ít nhất {MIN_QUERY_LENGTH} ký tự để tìm SKU.</p>
      ) : skus.isError ? (
        <ErrorStatus error={skus.error} onRetry={() => void skus.refetch()} overrides={SEARCH_UNAVAILABLE} />
      ) : skus.isPending ? (
        <p role="status" className={HINT}>
          Đang tìm…
        </p>
      ) : skus.data.length === 0 ? (
        <p role="status" className={HINT}>
          Không có SKU phù hợp. Sách mới thì thêm ở phần Sách trước khi nhập kho.
        </p>
      ) : (
        <SkuResults skus={skus.data} onSelect={select} />
      )}
    </div>
  );
}

function SkuResults({ skus, onSelect }: { skus: SkuSearchResult[]; onSelect: (sku: SkuSearchResult) => void }) {
  return (
    <ul aria-label="SKU tìm thấy" className="flex flex-col gap-2">
      {skus.map((sku) => (
        <li key={sku.skuId}>
          <button type="button" onClick={() => onSelect(sku)} className={OPTION}>
            <span className="flex flex-col">
              <span className="font-medium">{sku.bookTitle}</span>
              <span className="text-muted text-sm">
                {sku.skuCode} · {enumLabel(COVER_TYPE_LABELS, sku.coverType)} · {sku.editionName || "Ấn bản hiện hành"}
                {sku.isLatestEdition ? " (mới nhất)" : ""}
              </span>
            </span>
            <span className="text-muted shrink-0 text-sm tabular-nums">
              Tồn {sku.available.toLocaleString("vi-VN")}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
