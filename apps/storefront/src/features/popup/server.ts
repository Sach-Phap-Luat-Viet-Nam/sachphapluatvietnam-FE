import "server-only";
import { unwrap } from "@slvn/api-client";
import { serverApi } from "@/lib/api";
import { popupSchema } from "./schemas";
import type { Popup } from "./schemas";

/**
 * Các popup đang chạy (tối đa 3, theo ưu tiên) cho khu "Ưu đãi đang chạy" ở trang chủ. Lỗi thì trả mảng rỗng và ẩn khu
 * này: ưu đãi không quan trọng bằng nội dung trang, và trang chủ được dựng tĩnh nên không để một API phụ làm hỏng cả trang.
 */
export async function getRunningPopups(): Promise<Popup[]> {
  try {
    const data = await unwrap(serverApi.GET("/api/v1/popups/running"));
    return popupSchema.array().parse(data);
  } catch (error) {
    console.error("Không tải được danh sách ưu đãi đang chạy", error);
    return [];
  }
}
