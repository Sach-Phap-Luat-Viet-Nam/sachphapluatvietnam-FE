"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { cn } from "@slvn/ui";
import { formatDiscount, formatPrice } from "@slvn/utils";
import { animateWindowScroll } from "@/lib/animate-scroll";

export interface MobileBuyBarProps {
  /** `id` của khối đặt mua trên trang. */
  targetId: string;
  title: string;
  /** Giá SKU còn hàng rẻ nhất; nhiều SKU thì hiện "Từ". */
  salePrice: number;
  listPrice: number;
  discountPercent: number | null;
  hasMultipleOptions: boolean;
}

/** Khoảng chừa phía trên khối đặt mua khi cuộn tới. */
const SCROLL_OFFSET_PX = 16;

/**
 * Thanh giá gọn ghim đáy màn hình trên mobile/tablet. Ở đó khối đặt mua nằm dưới mô hình sách 3D và tiêu đề, khách phải
 * cuộn mới thấy giá. Thanh chỉ hiện khi khối đặt mua không nằm trong màn hình; bấm "Chọn mua" là cuộn tới khối đó và đưa
 * focus vào ô đầu tiên, nên cả việc chọn loại bìa, số lượng, xác nhận ấn bản cũ vẫn chỉ ở một chỗ (`AddToCartForm`).
 * Chừa góc phải cho nút Zalo.
 */
export function MobileBuyBar({
  targetId,
  title,
  salePrice,
  listPrice,
  discountPercent,
  hasMultipleOptions,
}: MobileBuyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry ? !entry.isIntersecting : false));
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  const goToPurchase = () => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET_PX;
    animateWindowScroll(top, () => {
      target.querySelector<HTMLElement>("input, select, button")?.focus({ preventScroll: true });
    });
  };

  const discount = formatDiscount(discountPercent);
  return (
    <div
      inert={!visible}
      className={cn(
        "bg-panel/95 border-gold/40 fixed right-21 bottom-4 left-4 z-30 flex items-center gap-3 border px-4 py-2.5 shadow-[0_16px_30px_-12px_rgb(0_0_0/0.8)] backdrop-blur transition-[translate,opacity] duration-300 sm:right-23 sm:bottom-6 sm:left-6 lg:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[150%] opacity-0",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-mist truncate text-xs">{title}</span>
        <span className="flex items-baseline gap-2">
          <span className="text-gold font-semibold whitespace-nowrap">
            {hasMultipleOptions && "Từ "}
            {formatPrice(salePrice)}
          </span>
          {listPrice > salePrice && (
            <span className="text-mist text-xs whitespace-nowrap line-through">{formatPrice(listPrice)}</span>
          )}
          {discount && <span className="text-upcoming text-xs whitespace-nowrap">{discount}</span>}
        </span>
      </div>
      <button
        type="button"
        onClick={goToPurchase}
        className="btn-sweep bg-gold text-ink flex min-h-11 shrink-0 items-center gap-2 px-4 text-sm font-semibold"
      >
        <ShoppingBag size={16} aria-hidden="true" />
        Chọn mua
      </button>
    </div>
  );
}
