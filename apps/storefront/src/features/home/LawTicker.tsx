import { cn } from "@slvn/ui";

export interface LawTickerProps {
  items: readonly string[];
}

function TickerRow({ items, hidden }: LawTickerProps & { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex">
      {items.map((text, index) => (
        <li
          // Danh sách có thể lặp lại (fillRow) nên dùng index làm key.
          key={index}
          className={cn(
            "font-editorial flex items-center gap-7 pr-7 text-2xl whitespace-nowrap italic sm:text-3xl",
            index % 2 ? "text-ivory" : "text-gold",
          )}
        >
          {text}
          <span aria-hidden="true" className="text-gold text-sm not-italic">
            ◆
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Băng chữ chạy các văn bản được cập nhật trong sách mới; dừng khi rê chuột hoặc focus. */
/** Số mục tối thiểu mỗi dãy để băng chữ luôn dài hơn bề ngang màn hình. */
const MIN_ROW_ITEMS = 6;

export function LawTicker({ items }: LawTickerProps) {
  if (!items.length) return null;
  const row = Array.from({ length: Math.ceil(MIN_ROW_ITEMS / items.length) }, () => items).flat();
  return (
    <section
      aria-label="Văn bản được cập nhật trong sách mới"
      className="marquee border-gold/30 bg-ink-deep overflow-hidden border-y py-5"
    >
      {/* Hai dãy giống nhau nối đuôi để vòng chạy liền mạch; dãy thứ hai ẩn với trình đọc màn hình. */}
      <div className="marquee-track">
        <TickerRow items={row} />
        <TickerRow items={row} hidden />
      </div>
    </section>
  );
}
