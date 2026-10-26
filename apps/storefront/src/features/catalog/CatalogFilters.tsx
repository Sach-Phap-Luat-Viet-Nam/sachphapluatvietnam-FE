import Link from "next/link";
import { cn } from "@slvn/ui";
import type { CatalogParams } from "./catalog";
import { BOOK_TYPE_LABELS, PRICE_RANGES, isPriceRangeActive, param, priceRangeHref } from "./catalog";

export interface CatalogFiltersProps {
  params: CatalogParams;
  /** Tiền tố id để dùng được hai bản (sidebar desktop và bảng trượt mobile) trên cùng trang. */
  idPrefix: string;
}

// Chữ hoa bằng CSS để trình đọc màn hình đọc tiêu đề như từ thường.
const LEGEND = "text-gold pb-3 text-[11px] tracking-[0.26em] uppercase";
// Đường kẻ đặt ở thẻ bọc: <legend> luôn nằm đè lên viền trên của <fieldset>.
const DIVIDER = "border-gold/20 border-t pt-6";
const FIELD = "border-border bg-ink-deep text-ivory h-11 w-full border px-3 text-sm";

/** Bộ lọc dạng form GET: chạy được cả khi chưa tải JavaScript. */
export function CatalogFilters({ params, idPrefix }: CatalogFiltersProps) {
  // Giá trị lạ trên URL bị bỏ khi gọi API (toBooksQuery) nên ở đây coi như "Tất cả".
  const type = Object.hasOwn(BOOK_TYPE_LABELS, param(params, "type")) ? param(params, "type") : "";
  return (
    <form action="/sach" className="flex flex-col gap-7">
      {["q", "category", "sort"].map((key) =>
        param(params, key) ? <input key={key} type="hidden" name={key} value={param(params, key)} /> : null,
      )}

      <fieldset className="flex flex-col">
        <legend className={LEGEND}>Loại sách</legend>
        {[["", "Tất cả loại sách"], ...Object.entries(BOOK_TYPE_LABELS)].map(([value, label]) => (
          <label key={value} className="has-checked:text-gold flex min-h-10 items-center gap-3 text-[15px]">
            <input
              type="radio"
              name="type"
              value={value}
              defaultChecked={type === value}
              className="accent-gold size-4.5"
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className={DIVIDER}>
        <fieldset className="flex flex-col gap-3">
          <legend className={LEGEND}>Khoảng giá</legend>
          <div className="flex flex-col gap-2">
            {PRICE_RANGES.map((range) => {
              const active = isPriceRangeActive(params, range);
              return (
                <Link
                  key={range.label}
                  href={priceRangeHref(params, range)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex min-h-10 items-center border px-3.5 text-sm transition-colors",
                    active ? "border-gold bg-gold/12 text-gold" : "border-border hover:border-gold",
                  )}
                >
                  {range.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Giá từ</span>
              <input
                id={`${idPrefix}-min-price`}
                name="minPrice"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Từ"
                defaultValue={param(params, "minPrice")}
                className={FIELD}
              />
            </label>
            <span aria-hidden="true" className="text-mist">
              –
            </span>
            <label className="min-w-0 flex-1">
              <span className="sr-only">Giá đến</span>
              <input
                id={`${idPrefix}-max-price`}
                name="maxPrice"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Đến"
                defaultValue={param(params, "maxPrice")}
                className={FIELD}
              />
            </label>
          </div>
        </fieldset>
      </div>

      <button type="submit" className="btn-sweep bg-gold text-ink min-h-12 text-[15px] font-semibold">
        Áp dụng bộ lọc
      </button>
    </form>
  );
}
