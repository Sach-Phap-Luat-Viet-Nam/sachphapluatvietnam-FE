"use client";

import type { ReactNode } from "react";
import { CheckoutSummary } from "./CheckoutSummary";
import type { Cart } from "./schemas";
import { useCheckoutPreview } from "./useCheckoutPreview";

export interface CartSummaryProps {
  /** Giỏ: chỉ cần các dòng để làm khóa tải lại, tạm tính và tổng số cuốn. */
  cart: Pick<Cart, "subtotal" | "totalQuantity"> & { items?: Cart["items"] };
  /** Tổng giá bìa của các dòng (`listSubtotal` trong `cart.ts`); lớn hơn tạm tính thì hiện giá gốc và số tiền tiết kiệm. */
  listSubtotal?: number;
  /** Nội dung đặt dưới tổng tiền, ví dụ nút "Đặt hàng". */
  action?: ReactNode;
  /** Giỏ đang được cập nhật: số tiền đang hiện có thể sắp đổi. */
  updating?: boolean;
}

/**
 * Tóm tắt giỏ hàng theo `POST /checkout/preview` (chưa chọn tỉnh nên phí ship tính cố định): khuyến mãi tự động, phí ship
 * và tổng đều do backend tính. Preview lỗi thì chỉ hiện tạm tính, không chặn sang thanh toán.
 */
export function CartSummary({ cart, listSubtotal = 0, action, updating = false }: CartSummaryProps) {
  const signature =
    (cart.items ?? []).map((item) => `${item.skuId}x${item.quantity}`).join(",") || String(cart.subtotal);
  const preview = useCheckoutPreview({ source: "cart", signature });
  return (
    <CheckoutSummary
      fallback={{ subtotal: cart.subtotal, totalQuantity: cart.totalQuantity }}
      listSubtotal={listSubtotal}
      preview={preview.data}
      updating={updating || preview.updating}
      loadFailed={preview.isError}
      coupon={null}
      lines={action}
    />
  );
}
