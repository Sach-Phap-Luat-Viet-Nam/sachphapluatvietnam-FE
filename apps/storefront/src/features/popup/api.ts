import { createApiClient, unwrap } from "@slvn/api-client";
import type { ApiClient } from "@slvn/api-client";
import { popupSchema } from "./schemas";
import type { Popup } from "./schemas";

let client: ApiClient | null = null;

/** Popup đang chạy, `null` khi backend trả 204. Gọi từ trình duyệt qua proxy `/api/v1` (backend chưa bật CORS). */
export async function getActivePopup(): Promise<Popup | null> {
  client ??= createApiClient({ baseUrl: window.location.origin });
  const data = await unwrap(client.GET("/api/v1/popups/active"));
  return data === undefined ? null : popupSchema.parse(data);
}
