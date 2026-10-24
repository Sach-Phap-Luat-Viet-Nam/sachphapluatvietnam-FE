import { z } from "zod";
import { SLUG_PATTERN } from "@slvn/utils";
import { MAX_QUANTITY_PER_SKU } from "./cart";

// "Mua ngay" (docs/features/storefront-buy-now.md): trang chi tiết chuyển sang `/thanh-toan` kèm lựa chọn trên URL (F5 không
// mất), trang thanh toán đọc sách bằng `GET /books/{slug}` thay vì đọc giỏ, rồi đặt bằng `POST /orders/buy-now`.

/** Query của trang thanh toán ở chế độ Mua ngay: `/thanh-toan?mua-ngay=<slug>&sku=<skuId>&sl=<số lượng>`. */
const PARAMS = { slug: "mua-ngay", skuId: "sku", quantity: "sl" } as const;

export interface BuyNowSelection {
  slug: string;
  skuId: number;
  quantity: number;
}

export function buyNowHref({ slug, skuId, quantity }: BuyNowSelection): string {
  const query = new URLSearchParams({
    [PARAMS.slug]: slug,
    [PARAMS.skuId]: String(skuId),
    [PARAMS.quantity]: String(quantity),
  });
  return `/thanh-toan?${query.toString()}`;
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined): number | null {
  return value !== undefined && /^\d{1,9}$/.test(value) && Number(value) > 0 ? Number(value) : null;
}

/**
 * Lựa chọn Mua ngay trên URL. `null`: không có `mua-ngay` (đặt từ giỏ như thường); `"invalid"`: có nhưng thiếu hoặc sai
 * (link bị sửa tay), lúc đó báo lỗi thay vì lặng lẽ đặt từ giỏ.
 */
export function parseBuyNowParams(params: SearchParams): BuyNowSelection | "invalid" | null {
  const slug = first(params, PARAMS.slug);
  if (slug === undefined) return null;
  const skuId = positiveInteger(first(params, PARAMS.skuId));
  const quantity = positiveInteger(first(params, PARAMS.quantity));
  if (!SLUG_PATTERN.test(slug) || skuId === null || quantity === null || quantity > MAX_QUANTITY_PER_SKU) {
    return "invalid";
  }
  return { slug, skuId, quantity };
}

// Chỉ parse các field cần cho tóm tắt (schema đầy đủ thuộc feature catalog), như `quick-add.ts`.
const buyNowSkuSchema = z.object({
  id: z.number(),
  coverType: z.string(),
  salePrice: z.number(),
  listPrice: z.number(),
  inStock: z.boolean(),
});

export const buyNowBookSchema = z.object({
  title: z.string(),
  slug: z.string(),
  editions: z.array(
    z.object({
      editionName: z.string().nullable(),
      coverImageUrl: z.string().nullable(),
      status: z.string(),
      skus: z.array(buyNowSkuSchema),
    }),
  ),
});
export type BuyNowBook = z.infer<typeof buyNowBookSchema>;

/** Dòng duy nhất của đơn Mua ngay, dựng từ chi tiết sách để xem trước; số chốt là của response tạo đơn. */
export interface BuyNowLine {
  skuId: number;
  bookTitle: string;
  editionName: string | null;
  coverType: string;
  coverImageUrl: string | null;
  unitPrice: number;
  listPrice: number;
  quantity: number;
  /** `salePrice × quantity`, chỉ để hiển thị tạm tính; không gửi lên backend. */
  lineTotal: number;
  /** Lý do chưa đặt được (ngừng bán, hết hàng); `null` khi đặt được. */
  blocker: string | null;
}

/** Tìm SKU khách chọn trong các ấn bản của sách. `null` khi SKU không còn thuộc sách (đã bị xóa hoặc link sai). */
export function buyNowLine(book: BuyNowBook, { skuId, quantity }: BuyNowSelection): BuyNowLine | null {
  for (const edition of book.editions) {
    const sku = edition.skus.find((item) => item.id === skuId);
    if (!sku) continue;
    // BR-03: chỉ ấn bản `on_sale`/`clearance` mới bán.
    const sellable = edition.status === "on_sale" || edition.status === "clearance";
    return {
      skuId,
      bookTitle: book.title,
      editionName: edition.editionName,
      coverType: sku.coverType,
      coverImageUrl: edition.coverImageUrl,
      unitPrice: sku.salePrice,
      listPrice: sku.listPrice,
      quantity,
      lineTotal: sku.salePrice * quantity,
      blocker: !sellable
        ? "Sách này hiện không còn bán. Bạn vui lòng quay lại trang sách để chọn ấn bản khác."
        : !sku.inStock
          ? "Sách đang tạm hết hàng. Bạn vui lòng quay lại sau hoặc chọn loại bìa khác."
          : null,
    };
  }
  return null;
}
