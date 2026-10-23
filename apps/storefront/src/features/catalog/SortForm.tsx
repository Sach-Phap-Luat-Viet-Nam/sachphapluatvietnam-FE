import { ArrowRight } from "lucide-react";
import type { CatalogParams } from "./catalog";
import { SORT_LABELS, param } from "./catalog";

export interface SortFormProps {
  params: CatalogParams;
}

/** Sắp xếp bằng form GET kèm nút áp dụng: đổi bằng bàn phím không làm tải lại trang sau mỗi lần bấm mũi tên. */
export function SortForm({ params }: SortFormProps) {
  return (
    <form action="/sach" className="flex items-center gap-2">
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
        className="border-border bg-ink-deep text-ivory h-11 min-w-0 flex-1 border px-3 text-[15px] sm:w-52 sm:flex-none"
      >
        {Object.entries(SORT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        aria-label="Áp dụng sắp xếp"
        className="border-gold text-gold hover:bg-gold hover:text-ink flex size-11 shrink-0 items-center justify-center border transition-colors"
      >
        <ArrowRight size={18} />
      </button>
    </form>
  );
}
