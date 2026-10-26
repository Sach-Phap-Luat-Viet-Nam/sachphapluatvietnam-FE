import { z } from "zod";

// `GET /combos` và `GET /combos/{slug}` chưa có trong OpenAPI (pending-paths.ts): parse theo `ComboResponse` của backend
// (docs/features/storefront-combo.md). Mọi số tiền là VNĐ nguyên do backend tính, FE không cộng trừ lại để gửi lên.

export const comboItemSchema = z.object({
  skuId: z.number(),
  skuCode: z.string(),
  bookTitle: z.string(),
  bookSlug: z.string(),
  editionName: z.string().nullable(),
  coverType: z.string(),
  coverImageUrl: z.string().nullable(),
  /** Số cuốn của SKU này trong một bộ. */
  quantity: z.number(),
  /** Giá hiện hành (đã gồm lịch giá) của một cuốn khi mua lẻ. */
  unitPrice: z.number(),
  isSellable: z.boolean(),
});
export type ComboItem = z.infer<typeof comboItemSchema>;

export const comboSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  /** Giá một bộ. */
  comboPrice: z.number(),
  /** Tổng giá hiện hành của một bộ nếu mua lẻ. */
  retailPrice: z.number(),
  /** `max(0, retailPrice − comboPrice)`. */
  savings: z.number(),
  items: z.array(comboItemSchema),
  /** false khi có sách trong bộ tạm ngừng bán: tắt nút mua. */
  isSellable: z.boolean(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
});
export type Combo = z.infer<typeof comboSchema>;
