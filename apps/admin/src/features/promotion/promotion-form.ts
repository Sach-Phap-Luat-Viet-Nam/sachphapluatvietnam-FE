import { fromVnDateTimeInput, toVnDateTimeInput } from "@/lib/vn-datetime";
import { AUDIENCES, DISCOUNT_TYPES, PROMOTION_KINDS, PROMOTION_MODES, SCOPE_TYPES } from "./labels";
import { parseTargetIds } from "./schemas";
import type { AdminPromotion, PromotionFormValues } from "./schemas";

/** Chương trình mới: bắt đầu từ đầu giờ kế tiếp (giờ Việt Nam), đang bật, giảm theo phần trăm, tự động áp dụng. */
export function emptyPromotionForm(now: Date = new Date()): PromotionFormValues {
  const nextHour = new Date(Math.ceil(now.getTime() / 3_600_000) * 3_600_000);
  return {
    name: "",
    title: "",
    description: "",
    kind: "order_discount",
    mode: "automatic",
    discountType: "percent",
    discountValue: "10",
    maxDiscountAmount: "",
    minOrderAmount: "0",
    scopeType: "all",
    targetIds: "",
    excludeOnSaleItems: false,
    audience: "everyone",
    usageLimit: "",
    perCustomerLimit: "",
    startsAt: toVnDateTimeInput(nextHour.toISOString()),
    endsAt: "",
    isActive: true,
    isPublic: true,
    priority: "0",
  };
}

/** Giá trị lạ (backend thêm mới) rơi về mặc định thay vì làm form hỏng. */
function oneOf<Value extends string>(options: readonly Value[], value: string, fallback: Value): Value {
  return options.find((item) => item === value) ?? fallback;
}

const text = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));

export function promotionToFormValues(promotion: AdminPromotion): PromotionFormValues {
  return {
    name: promotion.name,
    title: promotion.title,
    description: promotion.description ?? "",
    kind: oneOf(PROMOTION_KINDS, promotion.kind, "order_discount"),
    mode: oneOf(PROMOTION_MODES, promotion.mode, "automatic"),
    discountType: oneOf(DISCOUNT_TYPES, promotion.discountType, "percent"),
    discountValue: String(promotion.discountValue),
    maxDiscountAmount: text(promotion.maxDiscountAmount),
    minOrderAmount: String(promotion.minOrderAmount),
    scopeType: oneOf(SCOPE_TYPES, promotion.scopeType, "all"),
    targetIds: promotion.targetIds.join(", "),
    excludeOnSaleItems: promotion.excludeOnSaleItems,
    audience: oneOf(AUDIENCES, promotion.audience, "everyone"),
    usageLimit: text(promotion.usageLimit),
    perCustomerLimit: text(promotion.perCustomerLimit),
    startsAt: toVnDateTimeInput(promotion.startsAt),
    endsAt: toVnDateTimeInput(promotion.endsAt),
    isActive: promotion.isActive,
    isPublic: promotion.isPublic,
    priority: String(promotion.priority),
  };
}

const orNull = (value: string) => (value.trim() === "" ? null : Number(value));

/**
 * Body `UpsertPromotion`. Quy tắc của backend được áp luôn ở đây: free-ship chỉ có phạm vi `all` và không loại sách
 * đang sale; `maxDiscountAmount` chỉ dùng cho giảm theo phần trăm; `targetIds` chỉ khi phạm vi khác `all`.
 */
export function toPromotionBody(values: PromotionFormValues) {
  const freeShipping = values.kind === "free_shipping";
  const scopeType = freeShipping ? "all" : values.scopeType;
  const description = values.description.trim();
  return {
    name: values.name.trim(),
    title: values.title.trim(),
    ...(description ? { description } : {}),
    kind: values.kind,
    mode: values.mode,
    discountType: values.discountType,
    discountValue: Number(values.discountValue),
    maxDiscountAmount: values.discountType === "percent" ? orNull(values.maxDiscountAmount) : null,
    minOrderAmount: Number(values.minOrderAmount),
    scopeType,
    ...(scopeType === "all" ? {} : { targetIds: parseTargetIds(values.targetIds) ?? [] }),
    excludeOnSaleItems: freeShipping ? false : values.excludeOnSaleItems,
    audience: values.audience,
    usageLimit: orNull(values.usageLimit),
    perCustomerLimit: orNull(values.perCustomerLimit),
    startsAt: fromVnDateTimeInput(values.startsAt),
    endsAt: values.endsAt === "" ? null : fromVnDateTimeInput(values.endsAt),
    isActive: values.isActive,
    priority: Number(values.priority),
    isPublic: values.isPublic,
  };
}
export type PromotionBody = ReturnType<typeof toPromotionBody>;
