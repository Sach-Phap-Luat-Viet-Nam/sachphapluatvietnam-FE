"use client";

import type { ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { cn } from "@slvn/ui";
import { formatPrice } from "@slvn/utils";
import { quoteShipping } from "./api";
import { discountPercent, freeShippingGap } from "./cart";
import type { Cart } from "./schemas";

/**
 * Phí ship dự kiến theo tạm tính (BR-14). Tạm tính đổi thì giữ phí cũ trong lúc chờ báo giá mới, để dòng phí không
 * biến mất rồi hiện lại mỗi lần sửa số lượng.
 */
function useShippingQuote(subtotal: number) {
  return useQuery({
    queryKey: ["shipping-quote", subtotal],
    queryFn: () => quoteShipping(subtotal),
    enabled: subtotal > 0,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export interface CartSummaryProps {
  /** Giỏ, hoặc đơn Mua ngay một dòng: chỉ cần tạm tính và tổng số cuốn. */
  cart: Pick<Cart, "subtotal" | "totalQuantity">;
  /** Tổng giá bìa của các dòng (`listSubtotal` trong `cart.ts`); lớn hơn tạm tính thì hiện giá gốc và số tiền tiết kiệm. */
  listSubtotal?: number;
  /** Nội dung đặt dưới tổng tiền, ví dụ nút "Đặt hàng". */
  action?: ReactNode;
  /** Giỏ đang được cập nhật: số tiền đang hiện có thể sắp đổi. */
  updating?: boolean;
}

/**
 * Tạm tính, phí ship và tổng **dự kiến** để khách xem trước; số tiền chốt là của đơn backend tạo. Không lấy được phí
 * ship thì chỉ ẩn dòng phí, không chặn đặt hàng.
 */
export function CartSummary({ cart, listSubtotal = 0, action, updating = false }: CartSummaryProps) {
  const quote = useShippingQuote(cart.subtotal);
  const gap = quote.data ? freeShippingGap(cart.subtotal, quote.data) : null;
  // Chỉ để hiển thị: tạm tính và phí ship vẫn của backend. Không có giá bìa (hoặc không giảm) thì ẩn các dòng giảm giá.
  const saved = Math.max(0, listSubtotal - cart.subtotal);
  const percent = discountPercent(listSubtotal, cart.subtotal);

  return (
    <div className="border-gold/30 bg-panel flex flex-col gap-4 border px-6 py-7">
      <h2 className="font-editorial text-2xl font-bold">Tóm tắt đơn hàng</h2>
      <dl
        aria-busy={updating || quote.isPlaceholderData}
        className={cn(
          "flex flex-col gap-2.5 text-[15px] transition-opacity",
          (updating || quote.isPlaceholderData) && "opacity-50",
        )}
      >
        {saved > 0 && (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-sand">Giá gốc</dt>
              <dd className="text-mist line-through">{formatPrice(listSubtotal)}</dd>
            </div>
            <div className="text-ok flex justify-between gap-4">
              <dt>Giảm giá{percent !== null && ` (${percent}%)`}</dt>
              <dd>−{formatPrice(saved)}</dd>
            </div>
          </>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-sand">Tạm tính ({cart.totalQuantity} cuốn)</dt>
          <dd>{formatPrice(cart.subtotal)}</dd>
        </div>
        {quote.data && (
          <div className="flex justify-between gap-4">
            <dt className="text-sand">Phí vận chuyển</dt>
            <dd>{quote.data.shippingFee ? formatPrice(quote.data.shippingFee) : "Miễn phí"}</dd>
          </div>
        )}
        <div className="border-gold/25 flex justify-between gap-4 border-t pt-3.5 text-lg font-semibold">
          <dt>Tổng dự kiến</dt>
          <dd className="text-gold-pale">{formatPrice(cart.subtotal + (quote.data?.shippingFee ?? 0))}</dd>
        </div>
      </dl>
      {saved > 0 && (
        <p className="border-ok/50 text-ok bg-ok/10 border px-4 py-3 text-[15px] font-medium">
          Bạn tiết kiệm {formatPrice(saved)} so với giá bìa.
        </p>
      )}
      {quote.data && gap !== null && (
        <p className="text-mist text-sm leading-6">
          Mua thêm {formatPrice(gap)} để được miễn phí vận chuyển (đơn từ{" "}
          {formatPrice(quote.data.freeShippingThreshold)}).
        </p>
      )}
      {quote.isError && <p className="text-mist text-sm">Phí vận chuyển sẽ được tính khi tạo đơn.</p>}
      {action}
    </div>
  );
}
