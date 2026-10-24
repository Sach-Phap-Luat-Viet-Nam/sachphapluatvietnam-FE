"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatPrice } from "@slvn/utils";
import { quoteShipping } from "./api";
import { freeShippingGap } from "./cart";
import type { Cart } from "./schemas";

/** Phí ship dự kiến theo tạm tính (BR-14). */
function useShippingQuote(subtotal: number) {
  return useQuery({
    queryKey: ["shipping-quote", subtotal],
    queryFn: () => quoteShipping(subtotal),
    enabled: subtotal > 0,
    staleTime: 5 * 60_000,
  });
}

export interface CartSummaryProps {
  cart: Cart;
  /** Nội dung đặt dưới tổng tiền, ví dụ nút "Đặt hàng". */
  action?: ReactNode;
}

/**
 * Tạm tính, phí ship và tổng **dự kiến** để khách xem trước; số tiền chốt là của đơn backend tạo. Không lấy được phí
 * ship thì chỉ ẩn dòng phí, không chặn đặt hàng.
 */
export function CartSummary({ cart, action }: CartSummaryProps) {
  const quote = useShippingQuote(cart.subtotal);
  const gap = quote.data ? freeShippingGap(cart.subtotal, quote.data) : null;

  return (
    <div className="border-gold/30 bg-panel flex flex-col gap-4 border px-6 py-7">
      <h2 className="font-editorial text-2xl font-bold">Tóm tắt đơn hàng</h2>
      <dl className="flex flex-col gap-2.5 text-[15px]">
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
