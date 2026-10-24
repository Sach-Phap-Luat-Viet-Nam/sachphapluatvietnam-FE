import { z } from "zod";

// `/admin/shipping/*` chưa có trong OpenAPI (khai báo ở packages/api-client/src/pending-paths.ts): parse theo
// docs/features/checkout-promotion-shipping.md, mục 7.2.

export const zoneSchema = z.object({
  id: z.number(),
  name: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number(),
  provinces: z.array(z.string()),
  baseWeightGram: z.number(),
  baseFee: z.number(),
  stepWeightGram: z.number(),
  stepFee: z.number(),
  etaMinDays: z.number(),
  etaMaxDays: z.number(),
});
export type Zone = z.infer<typeof zoneSchema>;

/** Danh sách vùng: mảng trần hoặc `{ items }`. */
export const zoneListSchema = z.union([z.array(zoneSchema), z.object({ items: z.array(zoneSchema) })]);

export const shippingSettingsSchema = z.object({
  freeShippingThreshold: z.number().nullable(),
  packagingWeightGram: z.number(),
  defaultBookWeightGram: z.number(),
  flatFee: z.number(),
  /** Chỉ ở response: `true` = chưa ai lưu, đang dùng mặc định. */
  isDefault: z.boolean().optional(),
});
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;

const INTEGER_PATTERN = /^\d{1,12}$/;
const whole = (message: string) => z.string().trim().regex(INTEGER_PATTERN, message);

const positive = (message: string) => whole(message).refine((value) => Number(value) > 0, message);

export const zoneFormSchema = z
  .object({
    name: z.string().trim().min(1, "Anh/chị nhập tên vùng.").max(100, "Tối đa 100 ký tự."),
    isActive: z.boolean(),
    sortOrder: whole("Nhập số nguyên từ 0."),
    provinces: z.array(z.string()).min(1, "Chọn ít nhất một tỉnh/thành.").max(63, "Tối đa 63 tỉnh/thành."),
    baseWeightGram: positive("Nhập số gram lớn hơn 0."),
    baseFee: whole("Nhập số tiền (₫), nhập 0 nếu miễn phí."),
    stepWeightGram: positive("Nhập số gram lớn hơn 0."),
    stepFee: whole("Nhập số tiền (₫), nhập 0 nếu không cộng thêm."),
    etaMinDays: whole("Nhập số ngày."),
    etaMaxDays: whole("Nhập số ngày."),
  })
  .superRefine((values, ctx) => {
    const min = Number(values.etaMinDays);
    const max = Number(values.etaMaxDays);
    if (max > 60) {
      ctx.addIssue({ code: "custom", path: ["etaMaxDays"], message: "Tối đa 60 ngày." });
    } else if (max < min) {
      ctx.addIssue({
        code: "custom",
        path: ["etaMaxDays"],
        message: "Số ngày tối đa phải từ số ngày tối thiểu trở lên.",
      });
    }
  });
export type ZoneFormValues = z.infer<typeof zoneFormSchema>;

export const settingsFormSchema = z.object({
  freeShippingThreshold: z
    .string()
    .trim()
    .refine((value) => value === "" || INTEGER_PATTERN.test(value), "Nhập số tiền (₫) hoặc để trống để tắt."),
  packagingWeightGram: whole("Nhập số gram, nhập 0 nếu không tính."),
  defaultBookWeightGram: positive("Nhập số gram lớn hơn 0."),
  flatFee: whole("Nhập số tiền (₫)."),
});
export type SettingsFormValues = z.infer<typeof settingsFormSchema>;
