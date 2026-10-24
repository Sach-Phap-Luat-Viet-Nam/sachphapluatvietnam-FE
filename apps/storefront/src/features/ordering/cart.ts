import type { CartItem, ShippingQuote } from "./schemas";

/** Tối đa mỗi SKU trong giỏ và trong một đơn (FR-31); nhiều hơn thì gợi ý báo giá sỉ. */
export const MAX_QUANTITY_PER_SKU = 20;

/** `unsellable`: ấn bản đã ngừng bán sau khi thêm; `short`: số lượng trong giỏ vượt tồn khả dụng. */
export type LineIssue = "unsellable" | "short";

type StockFields = Pick<CartItem, "isSellable" | "quantity" | "availableQuantity">;

export function lineIssue(item: StockFields): LineIssue | null {
  if (!item.isSellable) return "unsellable";
  return item.quantity > item.availableQuantity ? "short" : null;
}

/**
 * Lý do chưa cho sang bước thanh toán, `null` khi đặt được. Chặn trước các trường hợp backend chắc chắn từ chối
 * (`CART_EMPTY`, `SKU_NOT_AVAILABLE`, `OUT_OF_STOCK`) để khách sửa ngay trong giỏ.
 */
export function checkoutBlocker(cart: { items: readonly StockFields[] }): string | null {
  if (!cart.items.length) return "Giỏ sách đang trống.";
  const issues = cart.items.map(lineIssue);
  if (issues.includes("unsellable")) return "Giỏ có sách đã ngừng bán, vui lòng xóa trước khi đặt hàng.";
  if (issues.includes("short")) return "Giỏ có sách không đủ số lượng, vui lòng giảm số lượng trước khi đặt hàng.";
  return null;
}

/** Số tiền còn thiếu để được miễn phí vận chuyển (BR-14), `null` khi đã được miễn phí. */
export function freeShippingGap(subtotal: number, quote: Pick<ShippingQuote, "freeShippingThreshold">): number | null {
  const gap = quote.freeShippingThreshold - subtotal;
  return gap > 0 ? gap : null;
}
