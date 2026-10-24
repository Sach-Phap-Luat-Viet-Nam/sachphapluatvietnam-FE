import { unwrap } from "@slvn/api-client";
import { browserApi } from "@slvn/auth";
import type { PromotionBody } from "./promotion-form";
import {
  adminPromotionSchema,
  couponListSchema,
  couponSchema,
  generatedCodesSchema,
  promotionPageSchema,
  promotionStatsSchema,
} from "./schemas";
import type { AdminPromotion, Coupon, PromotionStats } from "./schemas";

// API Admin khuyến mãi (docs/features/checkout-promotion-shipping.md, mục 7.1): `super_admin`, `product_manager`,
// `marketing`, bắt buộc 2FA.

export const PROMOTIONS_PAGE_SIZE = 20;

export async function fetchPromotions(page: number, q: string) {
  const data = await unwrap(
    browserApi().GET("/api/v1/admin/promotions", {
      params: { query: { page, limit: PROMOTIONS_PAGE_SIZE, ...(q ? { q } : {}) } },
    }),
  );
  return promotionPageSchema.parse(data);
}

export async function fetchPromotion(id: number): Promise<AdminPromotion> {
  return adminPromotionSchema.parse(
    await unwrap(browserApi().GET("/api/v1/admin/promotions/{id}", { params: { path: { id } } })),
  );
}

export async function createPromotion(body: PromotionBody): Promise<AdminPromotion> {
  return adminPromotionSchema.parse(await unwrap(browserApi().POST("/api/v1/admin/promotions", { body })));
}

export async function updatePromotion(id: number, body: PromotionBody): Promise<AdminPromotion> {
  const data = await unwrap(browserApi().PUT("/api/v1/admin/promotions/{id}", { params: { path: { id } }, body }));
  return adminPromotionSchema.parse(data);
}

/** Xóa mềm. */
export async function deletePromotion(id: number): Promise<void> {
  await unwrap(browserApi().DELETE("/api/v1/admin/promotions/{id}", { params: { path: { id } } }));
}

export async function fetchPromotionStats(id: number): Promise<PromotionStats> {
  const data = await unwrap(browserApi().GET("/api/v1/admin/promotions/{id}/stats", { params: { path: { id } } }));
  return promotionStatsSchema.parse(data);
}

export async function fetchCoupons(promotionId: number): Promise<Coupon[]> {
  const data = await unwrap(
    browserApi().GET("/api/v1/admin/promotions/{id}/coupons", { params: { path: { id: promotionId } } }),
  );
  const parsed = couponListSchema.parse(data);
  return Array.isArray(parsed) ? parsed : parsed.items;
}

export async function addCoupon(promotionId: number, body: { code: string; usageLimit?: number }): Promise<Coupon> {
  const data = await unwrap(
    browserApi().POST("/api/v1/admin/promotions/{id}/coupons", { params: { path: { id: promotionId } }, body }),
  );
  return couponSchema.parse(data);
}

/** Sinh hàng loạt, trả danh sách mã vừa tạo. `usageLimit` trống = mỗi mã dùng 1 lần. */
export async function generateCoupons(
  promotionId: number,
  body: { count: number; prefix?: string; usageLimit?: number },
): Promise<string[]> {
  const data = await unwrap(
    browserApi().POST("/api/v1/admin/promotions/{id}/coupons/generate", {
      params: { path: { id: promotionId } },
      body,
    }),
  );
  return generatedCodesSchema.parse(data).map((item) => (typeof item === "string" ? item : item.code));
}

export async function updateCoupon(
  id: number,
  body: { isActive: boolean; usageLimit?: number | null },
): Promise<Coupon> {
  const data = await unwrap(browserApi().PUT("/api/v1/admin/coupons/{id}", { params: { path: { id } }, body }));
  return couponSchema.parse(data);
}

export const promotionKeys = {
  lists: ["promotions"] as const,
  list: (page: number, q: string) => ["promotions", "list", page, q] as const,
  detail: (id: number) => ["promotions", "detail", id] as const,
  stats: (id: number) => ["promotions", "stats", id] as const,
  coupons: (id: number) => ["promotions", "coupons", id] as const,
};
