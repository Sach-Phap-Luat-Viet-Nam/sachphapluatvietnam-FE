"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Banknote, BookCheck, Truck, X } from "lucide-react";
import { cn } from "@slvn/ui";

// Chỉ nêu điều đã có trong hệ thống: phí ship và thanh toán (BR-14), nhãn "Cập nhật đến" (FR-22).
const MESSAGES: readonly { icon: LucideIcon; text: string }[] = [
  { icon: Truck, text: "Miễn phí vận chuyển cho đơn từ 300.000đ" },
  { icon: Banknote, text: "Thanh toán khi nhận hàng hoặc chuyển khoản" },
  { icon: BookCheck, text: "Mỗi cuốn ghi rõ văn bản được cập nhật đến đâu" },
];
/** Số lần lặp mỗi dãy để băng chữ luôn dài hơn màn hình rộng. */
const ROW_REPEAT = 3;
const ROW = Array.from({ length: ROW_REPEAT }, () => MESSAGES).flat();

function PromoRow({ hidden }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex">
      {ROW.map(({ icon: Icon, text }, index) => (
        // Dãy lặp lại cùng nội dung nên dùng index làm key.
        <li key={index} className="flex items-center gap-2 pr-10 whitespace-nowrap">
          <Icon size={15} strokeWidth={1.6} className="text-gold-pale shrink-0" />
          {text}
          <span aria-hidden="true" className="bg-gold-pale ml-8 size-1.5 rotate-45" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Thanh khuyến mãi chạy chữ trên đầu trang, dừng khi rê chuột hoặc focus. Đóng thì thu gọn lại và giữ đóng khi khách
 * chuyển trang trong site (Header nằm trong layout gốc); tải lại trang thì hiện lại.
 */
export function PromoBar() {
  const [open, setOpen] = useState(true);

  return (
    <div
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows] duration-500 ease-out",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="overflow-hidden">
        <section
          aria-label="Ưu đãi"
          className="promo-sheen bg-burgundy text-cream relative flex items-center text-xs sm:text-[13px]"
        >
          {/* Hai dãy giống nhau nối đuôi để vòng chạy liền mạch; dãy thứ hai ẩn với trình đọc màn hình. */}
          <div className="marquee min-w-0 flex-1 overflow-hidden mask-x-from-92% mask-x-to-100% py-2">
            <div className="marquee-track [animation-duration:40s]">
              <PromoRow />
              <PromoRow hidden />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Đóng thanh ưu đãi"
            className="text-cream/80 hover:text-cream flex size-9 shrink-0 items-center justify-center transition-[color,transform] duration-300 hover:rotate-90 focus-visible:-outline-offset-4 sm:mr-2"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </section>
      </div>
    </div>
  );
}
