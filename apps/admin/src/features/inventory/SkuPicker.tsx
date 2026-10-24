"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Search, X } from "lucide-react";
import { Button, cn } from "@slvn/ui";
import { ErrorStatus } from "@/components/QueryStatus";
import { HINT, INPUT } from "@/components/form-styles";
import { enumLabel } from "@/lib/enum-label";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { fetchBookSkus, inventoryKeys, searchBookOptions } from "./api";
import { COVER_TYPE_LABELS } from "./labels";
import type { BookOption, BookSkus, SkuOption } from "./schemas";

const MIN_QUERY_LENGTH = 2;
const NO_CATALOG_ACCESS = {
  FORBIDDEN:
    "Vai trò của anh/chị chưa được xem danh sách sách nên không tìm được SKU. Nhờ Super Admin hoặc Quản lý sản phẩm thao tác, hoặc xin thêm quyền.",
};
const OPTION =
  "border-border hover:border-primary hover:bg-primary/5 flex min-h-11 w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors";

export interface SkuPickerProps {
  /** `id` của ô tìm sách, dùng cho `htmlFor` của nhãn bên ngoài. */
  id: string;
  value: SkuOption | null;
  onChange: (value: SkuOption | null) => void;
  invalid?: boolean;
  describedBy?: string;
}

/** Nhãn hiển thị của một SKU: tên sách · ấn bản · loại bìa · mã SKU. */
export function skuOptionLabel(book: BookSkus, editionIndex: number, skuIndex: number): string {
  const edition = book.editions[editionIndex];
  const sku = edition?.skus[skuIndex];
  if (!edition || !sku) {
    return book.title;
  }
  const editionName = edition.editionName || `Ấn bản #${edition.id}`;
  return `${book.title} · ${editionName} · ${enumLabel(COVER_TYPE_LABELS, sku.coverType)} · ${sku.skuCode}`;
}

/**
 * Chọn SKU theo hai bước: tìm đầu sách (tên, slug, ISBN) rồi chọn SKU theo ấn bản và loại bìa. Backend chưa có API tìm
 * SKU nên đi qua API Catalog.
 */
export function SkuPicker({ id, value, onChange, invalid, describedBy }: SkuPickerProps) {
  const [query, setQuery] = useState("");
  const [book, setBook] = useState<BookOption | null>(null);

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

  if (book) {
    return (
      <BookSkuOptions
        book={book}
        onBack={() => setBook(null)}
        onSelect={(option) => {
          onChange(option);
          setBook(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
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
          placeholder="Gõ tên sách hoặc ISBN…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={cn(INPUT, "pl-10")}
        />
      </div>
      <BookResults query={query.trim()} onSelect={setBook} />
    </div>
  );
}

function BookResults({ query, onSelect }: { query: string; onSelect: (book: BookOption) => void }) {
  const debounced = useDebouncedValue(query);
  const enabled = debounced.length >= MIN_QUERY_LENGTH;
  const books = useQuery({
    queryKey: inventoryKeys.bookOptions(debounced),
    queryFn: () => searchBookOptions(debounced),
    enabled,
  });

  if (!enabled) {
    return <p className={HINT}>Gõ ít nhất {MIN_QUERY_LENGTH} ký tự để tìm đầu sách.</p>;
  }
  if (books.isError) {
    return <ErrorStatus error={books.error} onRetry={() => void books.refetch()} overrides={NO_CATALOG_ACCESS} />;
  }
  if (books.isPending) {
    return (
      <p role="status" className={HINT}>
        Đang tìm…
      </p>
    );
  }
  if (books.data.length === 0) {
    return (
      <p role="status" className={HINT}>
        Không có đầu sách phù hợp.
      </p>
    );
  }
  return (
    <ul aria-label="Đầu sách tìm thấy" className="flex flex-col gap-2">
      {books.data.map((option) => (
        <li key={option.id}>
          <button type="button" onClick={() => onSelect(option)} className={OPTION}>
            <BookOpen size={18} aria-hidden="true" className="text-muted shrink-0" />
            <span className="flex flex-col">
              <span className="font-medium">{option.title}</span>
              <span className="text-muted text-sm">{option.slug}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function BookSkuOptions({
  book,
  onBack,
  onSelect,
}: {
  book: BookOption;
  onBack: () => void;
  onSelect: (option: SkuOption) => void;
}) {
  const detail = useQuery({ queryKey: inventoryKeys.bookSkus(book.id), queryFn: () => fetchBookSkus(book.id) });

  return (
    <div className="border-border flex flex-col gap-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{book.title}</p>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Chọn sách khác
        </Button>
      </div>
      {detail.isError ? (
        <ErrorStatus error={detail.error} onRetry={() => void detail.refetch()} overrides={NO_CATALOG_ACCESS} />
      ) : detail.isPending ? (
        <p role="status" className={HINT}>
          Đang tải SKU…
        </p>
      ) : detail.data.editions.every((edition) => edition.skus.length === 0) ? (
        <p className={HINT}>Đầu sách này chưa có SKU. Thêm SKU ở phần Sách trước khi nhập kho.</p>
      ) : (
        <ul aria-label={`SKU của ${book.title}`} className="flex flex-col gap-2">
          {detail.data.editions.flatMap((edition, editionIndex) =>
            edition.skus.map((sku, skuIndex) => (
              <li key={sku.id}>
                <button
                  type="button"
                  onClick={() => onSelect({ id: sku.id, label: skuOptionLabel(detail.data, editionIndex, skuIndex) })}
                  className={OPTION}
                >
                  <span className="flex flex-col">
                    <span className="font-medium">
                      {sku.skuCode} · {enumLabel(COVER_TYPE_LABELS, sku.coverType)}
                    </span>
                    <span className="text-muted text-sm">
                      {edition.editionName || `Ấn bản #${edition.id}`}
                      {edition.isLatest ? " · Ấn bản mới nhất" : ""}
                    </span>
                  </span>
                </button>
              </li>
            )),
          )}
        </ul>
      )}
    </div>
  );
}
