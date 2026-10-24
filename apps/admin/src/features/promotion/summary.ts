import { formatPrice } from "@slvn/utils";
import type { AdminPromotion } from "./schemas";

/** Mô tả ngắn lợi ích để hiện ở danh sách: "Giảm 10% (tối đa 50.000 ₫)", "Miễn phí vận chuyển". */
export function benefitText(
  promotion: Pick<AdminPromotion, "kind" | "discountType" | "discountValue" | "maxDiscountAmount">,
): string {
  const shipping = promotion.kind === "free_shipping";
  if (shipping && promotion.discountType === "percent" && promotion.discountValue >= 100) {
    return "Miễn phí vận chuyển";
  }
  const subject = shipping ? "phí vận chuyển " : "";
  if (promotion.discountType === "percent") {
    const cap = promotion.maxDiscountAmount ? ` (tối đa ${formatPrice(promotion.maxDiscountAmount)})` : "";
    return `Giảm ${subject}${promotion.discountValue}%${cap}`;
  }
  return `Giảm ${subject}${formatPrice(promotion.discountValue)}`;
}
