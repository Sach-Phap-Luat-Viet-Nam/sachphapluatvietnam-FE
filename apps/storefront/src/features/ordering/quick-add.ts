import { z } from "zod";

// Thêm nhanh từ thẻ sách: danh sách `GET /books` không có SKU nên đọc `GET /books/{slug}` rồi chọn SKU. Chỉ parse các
// field cần dùng (schema đầy đủ thuộc feature catalog).

const quickAddSkuSchema = z.object({
  id: z.number(),
  coverType: z.string(),
  salePrice: z.number(),
  inStock: z.boolean(),
});

export const quickAddBookSchema = z.object({
  editions: z.array(
    z.object({
      isLatest: z.boolean(),
      status: z.string(),
      skus: z.array(quickAddSkuSchema),
    }),
  ),
});
export type QuickAddBook = z.infer<typeof quickAddBookSchema>;

export interface QuickAddChoice {
  skuId: number;
  coverType: string;
}

/**
 * SKU để thêm nhanh: thuộc ấn bản mới nhất đang bán (`on_sale`/`clearance`), còn hàng, giá rẻ nhất (đúng giá thẻ sách
 * đang hiện). `null` khi không có SKU mua được, lúc đó đưa khách sang trang chi tiết.
 */
export function pickQuickAddSku(book: QuickAddBook): QuickAddChoice | null {
  const edition = book.editions.find((item) => item.isLatest);
  if (!edition || (edition.status !== "on_sale" && edition.status !== "clearance")) return null;
  const cheapest = edition.skus
    .filter((sku) => sku.inStock)
    .reduce<z.infer<typeof quickAddSkuSchema> | null>(
      (best, sku) => (best === null || sku.salePrice < best.salePrice ? sku : best),
      null,
    );
  return cheapest && { skuId: cheapest.id, coverType: cheapest.coverType };
}
