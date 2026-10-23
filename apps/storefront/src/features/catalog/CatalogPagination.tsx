import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@slvn/ui";
import type { CatalogParams } from "./catalog";
import { catalogHref, pageWindow } from "./catalog";

export interface CatalogPaginationProps {
  params: CatalogParams;
  page: number;
  totalPages: number;
}

const STEP = "border-border hover:border-gold flex h-12 items-center gap-2 border px-4 text-sm transition-colors";

export function CatalogPagination({ params, page, totalPages }: CatalogPaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label="Phân trang"
      className="border-gold/25 mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-7"
    >
      <span className="text-mist text-sm">
        Trang {page} / {totalPages}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {page > 1 && (
          <Link href={catalogHref(params, { page: String(page - 1) })} aria-label="Trang trước" className={STEP}>
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Trang trước</span>
          </Link>
        )}
        {pageWindow(page, totalPages).map((number) => (
          <Link
            key={number}
            href={catalogHref(params, { page: String(number) })}
            aria-label={`Trang ${number}`}
            aria-current={number === page ? "page" : undefined}
            className={cn(
              "font-editorial flex size-12 items-center justify-center text-lg transition-colors",
              number === page ? "bg-gold text-ink font-bold" : "border-border hover:border-gold border",
            )}
          >
            {number}
          </Link>
        ))}
        {page < totalPages && (
          <Link href={catalogHref(params, { page: String(page + 1) })} aria-label="Trang sau" className={STEP}>
            <span className="hidden sm:inline">Trang sau</span>
            <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </nav>
  );
}
