import { cn } from "@slvn/ui";

export interface BookLoaderProps {
  /** Dòng trạng thái đọc cho trình đọc màn hình và hiện dưới cuốn sách, ví dụ "Đang mở tủ sách". */
  label: string;
  className?: string;
}

/** Trạng thái đang tải: cuốn sách mở lật trang liên tục (CSS `book-loader` trong globals.css), không cần JavaScript. */
export function BookLoader({ label, className }: BookLoaderProps) {
  return (
    <div role="status" className={cn("flex flex-col items-center justify-center gap-12 py-16", className)}>
      <div aria-hidden="true" className="relative">
        <div className="book-loader">
          <div className="book-loader-scene">
            <span className="book-loader-cover" />
            <span className="book-loader-block book-loader-block-left" />
            <span className="book-loader-block book-loader-block-right" />
            <span className="book-loader-page [--leaf:0]" />
            <span className="book-loader-page [--leaf:1]" />
            <span className="book-loader-page [--leaf:2]" />
          </div>
        </div>
        <span className="book-loader-shadow" />
      </div>
      <span className="text-gold text-xs tracking-[0.3em] uppercase">{label}…</span>
    </div>
  );
}
