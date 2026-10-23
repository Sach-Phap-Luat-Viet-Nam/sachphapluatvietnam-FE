import Link from "next/link";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { Button, cn } from "@slvn/ui";
import type { CatalogParams, FlatCategory } from "./catalog";
import { BOOK_TYPE_LABELS, COVER_TYPE_LABELS, param } from "./catalog";

/** Thụt lề danh mục con theo độ sâu; sâu hơn 3 cấp giữ mức cuối. */
const CATEGORY_INDENT = ["", "pl-5", "pl-10", "pl-14"];

export interface CatalogFiltersProps {
  params: CatalogParams;
  categories: readonly FlatCategory[];
}

export function CatalogFilters({ params, categories }: CatalogFiltersProps) {
  return (
    <details open className="border-border bg-background rounded-lg border p-5 lg:border-0 lg:p-0">
      <summary className="text-primary mb-5 flex list-none items-center justify-between font-semibold">
        Bộ lọc sách <SlidersHorizontal size={17} />
      </summary>
      <form action="/sach" className="space-y-6">
        <input type="hidden" name="q" value={param(params, "q")} />
        <input type="hidden" name="sort" value={param(params, "sort")} />
        <fieldset className="border-border border-t pt-5">
          <legend className="text-primary pt-5 text-sm font-semibold">Danh mục</legend>
          <div className="mt-3 space-y-3">
            {[{ slug: "", name: "Tất cả danh mục", depth: 0 }, ...categories].map((category) => (
              <label
                key={category.slug}
                className={cn(
                  "text-muted flex items-center gap-3 text-sm",
                  CATEGORY_INDENT[Math.min(category.depth, CATEGORY_INDENT.length - 1)],
                )}
              >
                <input
                  type="radio"
                  name="category"
                  value={category.slug}
                  defaultChecked={param(params, "category") === category.slug}
                  className="accent-primary size-4"
                />
                {category.name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="border-border border-t pt-4">
          <legend className="text-primary pt-4 text-sm font-semibold">Khoảng giá</legend>
          <div className="mt-3 flex items-center gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Giá từ</span>
              <input
                name="minPrice"
                type="number"
                min="0"
                placeholder="Từ ₫"
                defaultValue={param(params, "minPrice")}
                className="border-border h-10 w-full rounded border px-2 text-sm"
              />
            </label>
            <span className="text-muted">–</span>
            <label className="min-w-0 flex-1">
              <span className="sr-only">Giá đến</span>
              <input
                name="maxPrice"
                type="number"
                min="0"
                placeholder="Đến ₫"
                defaultValue={param(params, "maxPrice")}
                className="border-border h-10 w-full rounded border px-2 text-sm"
              />
            </label>
          </div>
        </fieldset>
        <label className="border-border text-primary block border-t pt-5 text-sm font-semibold">
          Loại sách
          <select
            name="type"
            defaultValue={param(params, "type")}
            className="border-border bg-background mt-3 h-11 w-full rounded border px-2 font-normal"
          >
            <option value="">Tất cả loại sách</option>
            {Object.entries(BOOK_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="text-primary text-sm font-semibold">Loại bìa</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {[["", "Tất cả"], ...Object.entries(COVER_TYPE_LABELS)].map(([value, label]) => (
              <label className="text-muted flex items-center gap-2 text-sm" key={value}>
                <input
                  type="radio"
                  name="cover"
                  value={value}
                  defaultChecked={param(params, "cover") === value}
                  className="accent-primary size-4"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" className="w-full">
          Áp dụng bộ lọc <ArrowRight size={16} />
        </Button>
        <Link href="/sach" className="text-muted block text-center text-sm underline underline-offset-4">
          Xóa bộ lọc
        </Link>
      </form>
    </details>
  );
}
