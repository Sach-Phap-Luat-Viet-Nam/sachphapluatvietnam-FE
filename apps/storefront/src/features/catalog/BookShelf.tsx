import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@slvn/ui";
import { tourAnchor } from "@/lib/tour-anchor";
import type { TourTarget } from "@/lib/tour-anchor";
import { BookCard } from "./BookCard";
import type { BookSummary } from "./schemas";

export interface BookShelfActions {
  cartAction?: ReactNode;
  dialogCartAction?: ReactNode;
}

export interface BookShelfProps {
  /** `id` của tiêu đề, cho `aria-labelledby`. */
  id: string;
  /** Dòng nhỏ chữ hoa phía trên tiêu đề. */
  eyebrow: string;
  title: ReactNode;
  description?: string;
  /** Link "xem tất cả" sang tủ sách đã lọc sẵn. */
  href: string;
  linkLabel: string;
  books: readonly BookSummary[];
  /** Nút mua nhanh cho từng thẻ (trang truyền vào từ feature ordering). */
  actions?: (book: BookSummary) => BookShelfActions;
  className?: string;
  /** Mốc của hướng dẫn sử dụng, gắn vào phần tiêu đề (cả kệ quá cao để khoanh sáng). */
  tour?: TourTarget;
}

/**
 * Một kệ sách có tiêu đề và link sang tủ sách đã lọc: mobile/tablet vuốt ngang (lộ một phần cuốn kế tiếp), desktop lưới 4
 * cột. Không có sách thì không render để trang không có khối trống.
 */
export function BookShelf({
  id,
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  books,
  actions,
  className,
  tour,
}: BookShelfProps) {
  if (!books.length) return null;
  return (
    <section aria-labelledby={id} className={className}>
      <div {...(tour ? tourAnchor(tour) : {})} className="motion-reveal flex flex-wrap items-end justify-between gap-6">
        <div className="flex max-w-xl flex-col gap-3">
          <p className="text-gold flex items-center gap-3.5 text-xs tracking-[0.3em] uppercase">
            <span className="bg-gold h-px w-10" />
            {eyebrow}
          </p>
          <h2 id={id} className="font-editorial text-[34px] leading-[1.08] font-bold sm:text-5xl">
            {title}
          </h2>
          {description && <p className="text-sand text-[17px] leading-8">{description}</p>}
        </div>
        <Link
          href={href}
          className="btn-sweep border-gold/50 hover:text-ink flex h-12 items-center gap-2.5 border px-6 text-[15px] font-medium transition-colors duration-500"
        >
          {linkLabel}
          <ArrowRight size={16} />
        </Link>
      </div>
      <ul
        className={cn(
          "-mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-5 overflow-x-auto px-4 pb-2",
          "sm:-mx-6 sm:mt-12 sm:scroll-px-6 sm:gap-8 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0",
        )}
      >
        {books.map((book) => {
          const action = actions?.(book);
          return (
            <li key={book.id} className="w-[68%] shrink-0 snap-start sm:w-[40%] lg:w-auto">
              <BookCard book={book} cartAction={action?.cartAction} dialogCartAction={action?.dialogCartAction} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
