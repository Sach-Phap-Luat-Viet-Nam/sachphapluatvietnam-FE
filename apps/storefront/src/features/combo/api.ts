import "server-only";
import { cache } from "react";
import { isApiError, unwrap } from "@slvn/api-client";
import { serverApi } from "@/lib/api";
import { comboSchema } from "./schemas";
import type { Combo } from "./schemas";

/**
 * Combo đang chạy (mới nhất trước, tối đa 50, đã ẩn combo có sách ngừng bán). `null` khi không tải được: combo chỉ là
 * phần thêm nên trang gọi hàm này ẩn khu combo chứ không báo lỗi cả trang. Bọc `cache` để nhiều khu trên một trang
 * (và Next.js) dùng chung một request.
 */
export const getCombos = cache(async (): Promise<Combo[] | null> => {
  try {
    return comboSchema.array().parse(await unwrap(serverApi.GET("/api/v1/combos")));
  } catch (error) {
    console.error("Không tải được danh sách combo", error);
    return null;
  }
});

/**
 * Chi tiết combo theo slug, `null` khi backend trả 404 (không chạy, đã xóa hoặc có sách không còn ở Catalog). Bọc
 * `cache` để `generateMetadata` và trang dùng chung một request.
 */
export const getCombo = cache(async (slug: string): Promise<Combo | null> => {
  try {
    const data = await unwrap(serverApi.GET("/api/v1/combos/{slug}", { params: { path: { slug } } }));
    return comboSchema.parse(data);
  } catch (error) {
    if (isApiError(error) && error.status === 404) {
      return null;
    }
    throw error;
  }
});
