/** Số tư vấn qua Zalo (Nguyễn Tài Thành). Đổi số ở đây là đổi cho cả nút và link. */
const ZALO_PHONE = "0984739739";

/**
 * Nút tư vấn qua Zalo nổi ở góc phải dưới mọi trang. Mobile chỉ hiện nút tròn; từ tablet hiện thêm tên và số điện thoại.
 * Mở `zalo.me` ở tab mới (trên điện thoại có cài Zalo sẽ mở thẳng ứng dụng).
 */
export function ZaloContact() {
  return (
    <a
      href={`https://zalo.me/${ZALO_PHONE}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Tư vấn qua Zalo"
      className="group fixed right-4 bottom-4 z-40 flex items-center gap-3 sm:right-6 sm:bottom-6"
    >
      <span className="bg-panel/95 border-zalo/50 group-hover:border-zalo hidden flex-col border px-4 py-2 text-right shadow-[0_16px_30px_-12px_rgb(0_0_0/0.8)] transition-colors sm:flex">
        <span className="text-ivory text-sm font-semibold">Tư vấn qua Zalo</span>
        <span className="text-sand text-xs">{ZALO_PHONE}</span>
      </span>
      <span className="relative flex size-14 shrink-0 items-center justify-center">
        <span
          aria-hidden="true"
          className="bg-zalo absolute inset-0 animate-[zalo-ring_2.4s_ease-out_infinite] rounded-full"
        />
        <span className="bg-zalo shadow-zalo/40 relative flex size-14 items-center justify-center rounded-full text-[15px] font-bold tracking-tight text-white shadow-lg transition-transform group-hover:scale-105">
          Zalo
        </span>
      </span>
    </a>
  );
}
