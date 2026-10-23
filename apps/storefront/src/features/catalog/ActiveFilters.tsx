import Link from "next/link";
import { X } from "lucide-react";
import type { ActiveFilter } from "./catalog";

export interface ActiveFiltersProps {
  filters: readonly ActiveFilter[];
}

export function ActiveFilters({ filters }: ActiveFiltersProps) {
  if (!filters.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="text-mist text-sm">Đang lọc</span>
      {filters.map((filter) => (
        <Link
          key={filter.key}
          href={filter.removeHref}
          aria-label={`Bỏ lọc ${filter.label}`}
          className="chip-remove border-gold/55 hover:border-gold hover:bg-gold/12 flex min-h-9 items-center gap-2 border pr-2.5 pl-3.5 text-sm transition-colors"
        >
          {filter.label}
          <X size={14} strokeWidth={2} className="text-gold" />
        </Link>
      ))}
      <Link href="/sach" className="link-underline text-gold ml-1 text-sm">
        Xóa tất cả
      </Link>
    </div>
  );
}
