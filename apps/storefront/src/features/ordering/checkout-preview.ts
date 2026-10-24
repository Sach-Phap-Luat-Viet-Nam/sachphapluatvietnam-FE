import { z } from "zod";

// `POST /checkout/preview` và `GET /promotions/active` chưa có trong OpenAPI (pending-paths.ts): parse theo
// docs/features/checkout-promotion-shipping.md. Mọi số tiền là VNĐ nguyên do backend tính, FE không cộng trừ lại.

export const appliedPromotionSchema = z.object({
  promotionId: z.number(),
  name: z.string(),
  kind: z.string(),
  couponCode: z.string().nullable(),
  amount: z.number(),
});
export type AppliedPromotion = z.infer<typeof appliedPromotionSchema>;

export const checkoutPreviewSchema = z.object({
  items: z.array(
    z.object({
      skuId: z.number(),
      skuCode: z.string(),
      bookTitle: z.string(),
      editionName: z.string().nullable(),
      coverType: z.string(),
      unitPrice: z.number(),
      quantity: z.number(),
      lineTotal: z.number(),
      discountAmount: z.number(),
    }),
  ),
  subtotal: z.number(),
  discount: z.number(),
  shippingFee: z.number(),
  shippingDiscount: z.number(),
  total: z.number(),
  appliedPromotions: z.array(appliedPromotionSchema),
  couponApplied: z.boolean().nullable(),
  freeShippingThreshold: z.number().nullable(),
  amountToFreeShipping: z.number(),
  eta: z.object({ minDays: z.number(), maxDays: z.number() }).nullable(),
  zoneName: z.string().nullable(),
});
export type CheckoutPreview = z.infer<typeof checkoutPreviewSchema>;

/** Phí ship khách thực trả: `shippingFee` đã trừ miễn phí theo ngưỡng nhưng chưa trừ `shippingDiscount`. */
export function payableShipping(preview: Pick<CheckoutPreview, "shippingFee" | "shippingDiscount">): number {
  return Math.max(0, preview.shippingFee - preview.shippingDiscount);
}

/** Câu "Dự kiến giao 2–4 ngày". */
export function etaText(eta: CheckoutPreview["eta"]): string | null {
  if (!eta) return null;
  return eta.minDays === eta.maxDays
    ? `Dự kiến giao trong ${eta.minDays} ngày`
    : `Dự kiến giao ${eta.minDays}–${eta.maxDays} ngày`;
}

export const publicPromotionSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  kind: z.string(),
  mode: z.string(),
  discountType: z.string(),
  discountValue: z.number(),
  maxDiscountAmount: z.number().nullable(),
  minOrderAmount: z.number(),
  scopeType: z.string(),
  excludeOnSaleItems: z.boolean(),
  audience: z.string(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
});
export type PublicPromotion = z.infer<typeof publicPromotionSchema>;
