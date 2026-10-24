import "server-only";
import { unwrap } from "@slvn/api-client";
import { serverApi } from "@/lib/api";
import { publicPromotionSchema } from "../ordering/checkout-preview";
import type { PublicPromotion } from "../ordering/checkout-preview";

/** Khuyến mãi đang chạy (tối đa 20, không chứa mã giảm giá). `null` khi không tải được để trang báo lỗi nhẹ. */
export async function getActivePromotions(): Promise<PublicPromotion[] | null> {
  try {
    return publicPromotionSchema.array().parse(await unwrap(serverApi.GET("/api/v1/promotions/active")));
  } catch (error) {
    console.error("Không tải được danh sách khuyến mãi", error);
    return null;
  }
}
