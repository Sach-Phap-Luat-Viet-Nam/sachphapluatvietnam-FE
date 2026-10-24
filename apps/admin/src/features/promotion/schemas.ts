import { z } from "zod";
import { pageSchema } from "@/lib/page-schema";
import { AUDIENCES, DISCOUNT_TYPES, PROMOTION_KINDS, PROMOTION_MODES, SCOPE_TYPES } from "./labels";

// `/admin/promotions` và `/admin/coupons` chưa có trong OpenAPI (khai báo ở packages/api-client/src/pending-paths.ts):
// parse theo docs/features/checkout-promotion-shipping.md, mục 7.1.

export const adminPromotionSchema = z.object({
  id: z.number(),
  name: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  kind: z.string(),
  mode: z.string(),
  discountType: z.string(),
  discountValue: z.number(),
  maxDiscountAmount: z.number().nullable().optional(),
  minOrderAmount: z.number(),
  scopeType: z.string(),
  targetIds: z.array(z.number()).default([]),
  excludeOnSaleItems: z.boolean(),
  audience: z.string(),
  usageLimit: z.number().nullable().optional(),
  perCustomerLimit: z.number().nullable().optional(),
  /** UTC (`...Z`). */
  startsAt: z.string(),
  /** UTC, mốc loại trừ; `null` = chưa có hạn. */
  endsAt: z.string().nullable(),
  isActive: z.boolean(),
  priority: z.number(),
  isPublic: z.boolean(),
  /** `inactive | scheduled | running | ended | exhausted`: backend tính lúc trả về. */
  status: z.string(),
  usedCount: z.number().default(0),
  couponCount: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminPromotion = z.infer<typeof adminPromotionSchema>;

export const promotionPageSchema = pageSchema(adminPromotionSchema);

export const promotionStatsSchema = z.object({
  usedCount: z.number(),
  releasedCount: z.number(),
  totalOrderDiscount: z.number(),
  totalShippingDiscount: z.number(),
  uniqueCustomers: z.number(),
});
export type PromotionStats = z.infer<typeof promotionStatsSchema>;

/** Mã giảm giá của chương trình. Doc chưa mô tả response nên chỉ `code` là bắt buộc, phần còn lại có mặc định. */
export const couponSchema = z.object({
  id: z.number(),
  code: z.string(),
  usageLimit: z.number().nullable().optional(),
  usedCount: z.number().default(0),
  isActive: z.boolean().default(true),
});
export type Coupon = z.infer<typeof couponSchema>;

/** Danh sách mã: mảng trần hoặc `{ items }`. */
export const couponListSchema = z.union([z.array(couponSchema), z.object({ items: z.array(couponSchema) })]);

/** Mã vừa sinh hàng loạt: mảng chuỗi hoặc mảng đối tượng có `code`. */
export const generatedCodesSchema = z.array(z.union([z.string(), z.object({ code: z.string() })]));

/** Giá trị ô `DateTimeInput`: `2026-11-01T08:30`. */
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const INTEGER_PATTERN = /^\d{1,12}$/;

const wholeNumber = (message: string) => z.string().trim().regex(INTEGER_PATTERN, message);
const optionalWholeNumber = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || INTEGER_PATTERN.test(value), message);

/** Mã đơn vị cho id trong ô "Áp dụng cho": số nguyên dương, cách nhau bởi dấu phẩy, chấm phẩy hoặc xuống dòng. */
export function parseTargetIds(text: string): number[] | null {
  const parts = text.split(/[\s,;]+/).filter(Boolean);
  if (parts.some((part) => !/^[1-9]\d{0,15}$/.test(part))) {
    return null;
  }
  return [...new Set(parts.map(Number))];
}

export const promotionFormSchema = z
  .object({
    name: z.string().trim().min(1, "Anh/chị nhập tên nội bộ.").max(255, "Tối đa 255 ký tự."),
    title: z.string().trim().min(1, "Anh/chị nhập tiêu đề hiển thị cho khách.").max(255, "Tối đa 255 ký tự."),
    description: z.string().trim().max(1000, "Tối đa 1000 ký tự."),
    kind: z.enum(PROMOTION_KINDS),
    mode: z.enum(PROMOTION_MODES),
    discountType: z.enum(DISCOUNT_TYPES),
    discountValue: wholeNumber("Nhập số nguyên lớn hơn 0."),
    maxDiscountAmount: optionalWholeNumber("Nhập số tiền (₫), để trống nếu không giới hạn."),
    minOrderAmount: wholeNumber("Nhập số tiền (₫), nhập 0 nếu không yêu cầu."),
    scopeType: z.enum(SCOPE_TYPES),
    targetIds: z.string(),
    excludeOnSaleItems: z.boolean(),
    audience: z.enum(AUDIENCES),
    usageLimit: optionalWholeNumber("Nhập số lượt hoặc để trống."),
    perCustomerLimit: optionalWholeNumber("Nhập số lượt hoặc để trống."),
    startsAt: z.string().regex(DATE_TIME_PATTERN, "Nhập thời điểm bắt đầu dạng dd/mm/yyyy hh:mm."),
    endsAt: z
      .string()
      .refine(
        (value) => value === "" || DATE_TIME_PATTERN.test(value),
        "Nhập thời điểm kết thúc dạng dd/mm/yyyy hh:mm.",
      ),
    isActive: z.boolean(),
    isPublic: z.boolean(),
    priority: z
      .string()
      .trim()
      .regex(/^\d{1,4}$/, "Nhập số nguyên từ 0 đến 1000.")
      .refine((value) => Number(value) <= 1000, "Nhập số nguyên từ 0 đến 1000."),
  })
  .superRefine((values, ctx) => {
    const issue = (path: keyof typeof values, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    const value = Number(values.discountValue);
    if (values.discountType === "percent" && (value < 1 || value > 100)) {
      issue("discountValue", "Phần trăm giảm từ 1 đến 100.");
    } else if (values.discountType === "fixed_amount" && value <= 0) {
      issue("discountValue", "Số tiền giảm phải lớn hơn 0.");
    }

    // Free-ship luôn áp cho cả đơn nên bỏ qua phạm vi (form khóa ô này và body gửi `all`).
    if (values.kind === "order_discount" && values.scopeType !== "all") {
      const ids = parseTargetIds(values.targetIds);
      if (ids === null || ids.length === 0) {
        issue("targetIds", "Nhập ít nhất một ID (số nguyên dương), cách nhau bằng dấu phẩy.");
      } else if (ids.length > 500) {
        issue("targetIds", "Tối đa 500 ID.");
      }
    }

    // Cùng định dạng `YYYY-MM-DDTHH:mm` nên so sánh chuỗi là so sánh thời gian.
    if (values.endsAt !== "" && values.endsAt <= values.startsAt) {
      issue("endsAt", "Thời điểm kết thúc phải sau thời điểm bắt đầu.");
    }
  });
export type PromotionFormValues = z.infer<typeof promotionFormSchema>;

/** Form thêm mã lẻ. Mã 4–40 ký tự `A–Z 0–9 _ -`, hệ thống tự viết hoa. */
export const couponFormSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{4,40}$/, "Mã gồm 4–40 ký tự: chữ, số, dấu gạch ngang hoặc gạch dưới."),
  usageLimit: optionalWholeNumber("Nhập số lượt hoặc để trống."),
});
export type CouponFormInput = z.input<typeof couponFormSchema>;
export type CouponFormValues = z.output<typeof couponFormSchema>;

/** Form sinh mã hàng loạt. */
export const generateFormSchema = z.object({
  count: z
    .string()
    .trim()
    .regex(/^\d{1,4}$/, "Nhập số mã cần sinh (1–1000).")
    .refine((value) => Number(value) >= 1 && Number(value) <= 1000, "Nhập số mã cần sinh (1–1000)."),
  prefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{0,20}$/, "Tiền tố tối đa 20 ký tự: chữ, số, dấu gạch ngang hoặc gạch dưới."),
  usageLimit: optionalWholeNumber("Nhập số lượt hoặc để trống (mỗi mã dùng 1 lần)."),
});
export type GenerateFormInput = z.input<typeof generateFormSchema>;
export type GenerateFormValues = z.output<typeof generateFormSchema>;
