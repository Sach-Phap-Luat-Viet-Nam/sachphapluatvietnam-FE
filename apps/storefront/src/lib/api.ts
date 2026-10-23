import "server-only";
import { createApiClient } from "@slvn/api-client";
import { env } from "./env";

/** Thời gian cache dữ liệu catalog công khai trên server (giây). */
const REVALIDATE_SECONDS = 60;

/** Client gọi backend từ Server Component. Chỉ dùng cho API công khai, không gửi cookie của khách. */
export const serverApi = createApiClient({
  baseUrl: env.API_BASE_URL,
  fetch: (request) => fetch(request, { next: { revalidate: REVALIDATE_SECONDS } }),
});
