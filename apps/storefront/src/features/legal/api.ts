import "server-only";
import { cache } from "react";
import { isApiError, unwrap } from "@slvn/api-client";
import { serverApi } from "@/lib/api";
import { staticPageSchema } from "./schemas";
import type { StaticPage } from "./schemas";

/**
 * Trang tĩnh theo slug, `null` khi backend trả 404 (không có hoặc chưa xuất bản). Lỗi khác ném tiếp để hiện trang lỗi:
 * không hiển thị một văn bản chính sách thiếu hoặc cũ. Bọc `cache` để `generateMetadata` và trang dùng chung một request.
 */
export const getStaticPage = cache(async (slug: string): Promise<StaticPage | null> => {
  try {
    const data = await unwrap(serverApi.GET("/api/v1/pages/{slug}", { params: { path: { slug } } }));
    return staticPageSchema.parse(data);
  } catch (error) {
    if (isApiError(error) && error.status === 404) {
      return null;
    }
    throw error;
  }
});
