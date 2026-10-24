import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@slvn/ui";

export interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

/** Nút trang trước/sau theo `meta` phân trang của backend. Ẩn khi chỉ có một trang. */
export function Pagination({ page, limit, total, onPageChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) {
    return null;
  }
  return (
    <nav aria-label="Phân trang" className="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft size={16} aria-hidden="true" /> Trang trước
      </Button>
      <span className="text-muted text-sm">
        Trang {page}/{pages} · {total} mục
      </span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
        Trang sau <ChevronRight size={16} aria-hidden="true" />
      </Button>
    </nav>
  );
}
