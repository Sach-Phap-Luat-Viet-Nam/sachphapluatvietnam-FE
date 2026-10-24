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

/**
 * Phần trăm đã giảm so với giá bìa, làm tròn (`410.000` trên `750.000` → `45`). Chỉ để hiển thị nhãn "Giảm xx%": giá bán
 * luôn lấy từ backend. `null` khi không giảm.
 */
export function discountPercent(listPrice: number, unitPrice: number): number | null {
  if (listPrice <= 0 || unitPrice >= listPrice) return null;
  return Math.max(1, Math.round((1 - unitPrice / listPrice) * 100));
}

/** Tổng giá bìa của các dòng (`listPrice × quantity`), để so với tạm tính và hiện số tiền khách tiết kiệm được. */
export function listSubtotal(lines: readonly Pick<CartItem, "listPrice" | "quantity">[]): number {
  return lines.reduce((sum, line) => sum + line.listPrice * line.quantity, 0);
}

/** Số tiền còn thiếu để được miễn phí vận chuyển (BR-14), `null` khi đã được miễn phí. */
export function freeShippingGap(subtotal: number, quote: Pick<ShippingQuote, "freeShippingThreshold">): number | null {
  if (quote.freeShippingThreshold === null) return null;
  const gap = quote.freeShippingThreshold - subtotal;
  return gap > 0 ? gap : null;
}
