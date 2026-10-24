import type { BadgeTone } from "@/components/StatusBadge";

// Theo docs/features/checkout-promotion-shipping.md, mục 7.1.

export const PROMOTION_KINDS = ["order_discount", "free_shipping"] as const;
export type PromotionKind = (typeof PROMOTION_KINDS)[number];
export const PROMOTION_KIND_LABELS: Record<PromotionKind, string> = {
  order_discount: "Giảm giá đơn hàng",
  free_shipping: "Giảm / miễn phí vận chuyển",
};

export const PROMOTION_MODES = ["automatic", "coupon"] as const;
export type PromotionMode = (typeof PROMOTION_MODES)[number];
export const PROMOTION_MODE_LABELS: Record<PromotionMode, string> = {
  automatic: "Tự động áp dụng khi đủ điều kiện",
  coupon: "Khách nhập mã giảm giá",
};

export const DISCOUNT_TYPES = ["percent", "fixed_amount"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];
export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  percent: "Theo phần trăm (%)",
  fixed_amount: "Số tiền cố định (₫)",
};

export const SCOPE_TYPES = ["all", "books", "skus", "categories"] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];
export const SCOPE_TYPE_LABELS: Record<ScopeType, string> = {
  all: "Mọi sách",
  books: "Một số đầu sách",
  skus: "Một số SKU (ấn bản + loại bìa)",
  categories: "Một số danh mục",
};
/** Nhãn của danh sách id theo phạm vi. */
export const SCOPE_TARGET_LABELS: Record<Exclude<ScopeType, "all">, string> = {
  books: "ID đầu sách",
  skus: "ID SKU",
  categories: "ID danh mục",
};

export const AUDIENCES = ["everyone", "members_only"] as const;
export type Audience = (typeof AUDIENCES)[number];
export const AUDIENCE_LABELS: Record<Audience, string> = {
  everyone: "Mọi khách",
  members_only: "Chỉ thành viên đã đăng nhập",
};

const STATUS_LABELS: Record<string, string> = {
  inactive: "Đang tắt",
  scheduled: "Chờ đến lịch",
  running: "Đang chạy",
  ended: "Đã kết thúc",
  exhausted: "Hết lượt",
};

const STATUS_TONES: Record<string, BadgeTone> = {
  inactive: "neutral",
  scheduled: "info",
  running: "success",
  ended: "warning",
  exhausted: "warning",
};

/** Nhãn trạng thái chương trình; trạng thái lạ (backend thêm mới) giữ nguyên mã. */
export function promotionStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function promotionStatusTone(status: string): BadgeTone {
  return STATUS_TONES[status] ?? "neutral";
}
