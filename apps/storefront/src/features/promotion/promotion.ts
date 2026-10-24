import { formatDate, formatPrice } from "@slvn/utils";
import type { PublicPromotion } from "../ordering/checkout-preview";

// Nhãn cho `GET /promotions/active` (docs/features/checkout-promotion-shipping.md, mục 5).

/** Nhãn lợi ích: "Giảm 10% · tối đa 50.000 ₫", "Giảm 30.000 ₫", "Miễn phí vận chuyển". */
export function benefitLabel(promotion: PublicPromotion): string {
  const isShipping = promotion.kind === "free_shipping";
  if (isShipping && promotion.discountType === "percent" && promotion.discountValue >= 100) {
    return "Miễn phí vận chuyển";
  }
  const subject = isShipping ? "phí vận chuyển " : "";
  if (promotion.discountType === "percent") {
    const cap = promotion.maxDiscountAmount ? ` · tối đa ${formatPrice(promotion.maxDiscountAmount)}` : "";
    return `Giảm ${subject}${promotion.discountValue}%${cap}`;
  }
  return `Giảm ${subject}${formatPrice(promotion.discountValue)}`;
}

const MS_PER_SECOND = 1000;

/**
 * `endsAt` là mốc loại trừ đã quy đổi UTC ("đến hết 31/12/2026" = 0h ngày 01/01/2027 giờ VN): lấy ngày của `endsAt` trừ
 * 1 giây (theo giờ VN) mới ra ngày cuối cùng được áp dụng.
 */
export function lastValidDate(endsAt: string): string | null {
  const time = Date.parse(endsAt);
  return Number.isNaN(time) ? null : formatDate(new Date(time - MS_PER_SECOND));
}

/** Câu hạn dùng: "Đến hết 31/12/2026", "Từ 01/11/2026 đến hết 30/11/2026", "Chưa có hạn kết thúc". */
export function validityText(promotion: Pick<PublicPromotion, "startsAt" | "endsAt">, now: Date = new Date()): string {
  const end = promotion.endsAt ? lastValidDate(promotion.endsAt) : null;
  const startsInFuture = Date.parse(promotion.startsAt) > now.getTime();
  const start = startsInFuture ? formatDate(promotion.startsAt) : null;
  if (start && end) return `Từ ${start} đến hết ${end}`;
  if (start) return `Từ ${start}`;
  return end ? `Đến hết ${end}` : "Chưa có hạn kết thúc";
}

const SCOPE_LABELS: Record<string, string> = {
  all: "Áp dụng cho mọi sách",
  books: "Chỉ áp dụng cho một số đầu sách",
  skus: "Chỉ áp dụng cho một số ấn bản",
  categories: "Chỉ áp dụng cho một số danh mục",
};

/** Các điều kiện hiển thị dưới thẻ khuyến mãi, theo thứ tự quan trọng với khách. */
export function conditionLines(promotion: PublicPromotion): string[] {
  const lines: string[] = [];
  lines.push(
    promotion.mode === "coupon"
      ? "Nhập mã giảm giá ở bước thanh toán"
      : "Tự động áp dụng khi thanh toán, không cần nhập mã",
  );
  if (promotion.minOrderAmount > 0) lines.push(`Đơn từ ${formatPrice(promotion.minOrderAmount)}`);
  if (promotion.kind !== "free_shipping") lines.push(SCOPE_LABELS[promotion.scopeType] ?? SCOPE_LABELS.all ?? "");
  if (promotion.excludeOnSaleItems) lines.push("Không áp dụng cho sách đang giảm giá sẵn");
  if (promotion.audience === "members_only") lines.push("Dành cho thành viên đã đăng nhập");
  return lines.filter(Boolean);
}
