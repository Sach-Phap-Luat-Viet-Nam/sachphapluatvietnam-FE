import "server-only";
import { cache } from "react";
import { unwrap } from "@slvn/api-client";
import { serverApi } from "@/lib/api";
import { shippingQuoteSchema } from "./schemas";

/**
 * Ngưỡng miễn phí vận chuyển của shop (`null` khi tắt hoặc không lấy được). Dùng `POST /shipping/quote` công khai: chỉ
 * đọc `freeShippingThreshold`, phí ship của số tạm tính này không dùng tới. Lỗi thì trả `null` để thanh ưu đãi và chân
 * trang bỏ câu này, không làm hỏng cả trang. `cache` để Header và Footer chỉ gọi một lần mỗi lần dựng trang.
 */
export const getFreeShippingThreshold = cache(async (): Promise<number | null> => {
  try {
    const quote = shippingQuoteSchema.parse(
      await unwrap(serverApi.POST("/api/v1/shipping/quote", { body: { subtotal: 1 } })),
    );
    return quote.freeShippingThreshold;
  } catch (error) {
    console.error("Không tải được ngưỡng miễn phí vận chuyển", error);
    return null;
  }
});
