import Link from "next/link";
import { Container, cn } from "@slvn/ui";

export interface CategoryStripItem {
  key: string;
  label: string;
  href: string;
  active?: boolean;
}

export interface CategoryStripProps {
  items: readonly CategoryStripItem[];
  /** Số thứ tự bắt đầu, ví dụ 0 khi mục đầu là "Tất cả". */
  startAt?: number;
  className?: string;
}

/** Thanh danh mục đánh số `01 Dân sự · 02 Hình sự …`; trên điện thoại cuộn ngang. */
export function CategoryStrip({ items, startAt = 1, className }: CategoryStripProps) {
  if (!items.length) return null;
  return (
    <nav aria-label="Danh mục sách" className={cn("border-gold/25 border-y", className)}>
      <Container className="flex overflow-x-auto">
        {items.map((item, index) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "category-link flex shrink-0 items-baseline gap-3 py-5 pr-7 whitespace-nowrap sm:py-6",
              item.active && "text-gold",
            )}
          >
            <span className="category-number font-editorial text-gold text-xl italic sm:text-2xl">
              {String(index + startAt).padStart(2, "0")}
            </span>
            <span className="text-[15px] sm:text-base">{item.label}</span>
          </Link>
        ))}
      </Container>
    </nav>
  );
}
