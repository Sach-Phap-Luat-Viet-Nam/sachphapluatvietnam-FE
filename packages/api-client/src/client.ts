import createClient from "openapi-fetch";
import type { Client } from "openapi-fetch";

import { ApiError } from "./api-error";
import type { paths } from "./generated/schema";
import type { PendingPaths } from "./pending-paths";

/** Route sinh từ OpenAPI cộng các route backend đã có nhưng chưa sinh lại type (`pending-paths.ts`). */
type ClientPaths = paths & PendingPaths;

export type ApiClient = Client<ClientPaths>;

export interface CreateApiClientOptions {
  /** Gốc URL của backend, ví dụ `http://localhost:5279`. Đường dẫn trong `paths` đã có tiền tố `/api/v1`. */
  baseUrl: string;
  headers?: Record<string, string>;
  /** Thay `fetch` mặc định, ví dụ để truyền tùy chọn cache `next: { revalidate }` của Next.js. */
  fetch?: (request: Request) => Promise<Response>;
}

/**
 * Tạo client gọi backend có type sinh từ OpenAPI. Luôn gửi kèm cookie vì access/refresh token nằm trong
 * cookie HttpOnly do backend đặt.
 */
export function createApiClient({ baseUrl, headers, fetch }: CreateApiClientOptions): ApiClient {
  return createClient<ClientPaths>({
    baseUrl,
    headers,
    credentials: "include",
    // openapi-fetch giữ tham chiếu `globalThis.fetch` lúc tạo client; đọc lại khi gọi để không bỏ qua `fetch`
    // đã được Next.js (cache/revalidate) hoặc MSW (test) thay thế sau đó.
    fetch: fetch ?? ((request) => globalThis.fetch(request)),
  });
}

type ApiResult<T> =
  { data: T; error?: never; response: Response } | { data?: never; error: unknown; response: Response };

/**
 * Chờ kết quả từ client, trả `data` khi thành công và ném `ApiError` khi backend trả lỗi.
 *
 * @example
 * const books = await unwrap(api.GET("/api/v1/books", { params: { query: { Page: 1 } } }));
 */
export async function unwrap<T>(request: Promise<ApiResult<T>>): Promise<T> {
  const result = await request;
  if (!result.response.ok) {
    throw ApiError.fromResponse(result.response, result.error);
  }

  // Nhánh thành công của openapi-fetch luôn có `data` (là `undefined` với response không có body).
  return result.data as T;
}
