import Link from "next/link";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@slvn/ui";
import { CATEGORIES } from "./demo-books";
import type { CatalogParams } from "./catalog";
import { param } from "./catalog";

export function CatalogFilters({ params }: { params: CatalogParams }) {
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
            {[{ slug: "", name: "Tất cả danh mục" }, ...CATEGORIES].map((category) => (
              <label key={category.slug} className="text-muted flex items-center gap-3 text-sm">
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
            <option value="code">Bộ luật</option>
            <option value="consolidated">Văn bản hợp nhất</option>
            <option value="commentary">Chú giải</option>
            <option value="qna">Hỏi đáp</option>
            <option value="textbook">Giáo trình</option>
            <option value="monograph">Sách chuyên khảo</option>
          </select>
        </label>
        <fieldset>
          <legend className="text-primary text-sm font-semibold">Loại bìa</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {[
              ["", "Tất cả"],
              ["paperback", "Bìa mềm"],
              ["hardcover", "Bìa cứng"],
            ].map(([value, label]) => (
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
