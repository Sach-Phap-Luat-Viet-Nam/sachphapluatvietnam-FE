import { tourAnchor } from "@/lib/tour-anchor";

/** Hai đầu mối Zalo. Đổi số ở đây là đổi cho cả nút và link. */
const ZALO_CONTACTS = [
  { label: "Tư vấn mua bán", phone: "0984739739" },
  { label: "Kỹ thuật, sự cố, hỏi đáp về đơn", phone: "0932000035" },
] as const;

/**
 * Nút tư vấn qua Zalo nổi ở góc phải dưới mọi trang. Bấm vào mở danh sách hai số (mua bán / kỹ thuật và đơn hàng);
 * dùng `<details>` nên không cần JS. Mỗi số mở `zalo.me` ở tab mới (trên điện thoại có cài Zalo sẽ mở thẳng ứng dụng).
 */
export function ZaloContact() {
  return (
    <details {...tourAnchor("zalo")} className="group fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      <summary
        aria-label="Tư vấn qua Zalo"
        className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden"
      >
        <span className="bg-panel/95 border-zalo/50 group-hover:border-zalo hidden flex-col border px-4 py-2 text-right shadow-[0_16px_30px_-12px_rgb(0_0_0/0.8)] transition-colors group-open:hidden sm:flex">
          <span className="text-ivory text-sm font-semibold">Tư vấn qua Zalo</span>
          <span className="text-sand text-xs">Chọn người hỗ trợ</span>
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
      </summary>
      <ul className="bg-panel border-zalo absolute right-[calc(100%+0.75rem)] bottom-0 flex w-64 flex-col border shadow-[0_16px_30px_-12px_rgb(0_0_0/0.8)]">
        {ZALO_CONTACTS.map(({ label, phone }) => (
          <li key={phone} className="border-zalo/30 not-last:border-b">
            <a
              href={`https://zalo.me/${phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-zalo/15 flex flex-col px-4 py-3 text-right"
            >
              <span className="text-ivory text-sm font-semibold">{label}</span>
              <span className="text-sand text-sm">{phone}</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
