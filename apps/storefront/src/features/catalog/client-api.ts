import { unwrap } from "@slvn/api-client";
import { browserApi } from "@slvn/auth";
import { bookPageSchema } from "./schemas";
import type { BookSummary } from "./schemas";

// Gọi từ trình duyệt qua proxy `/api/v1` (api.ts chỉ chạy trên server).

/** Số gợi ý tối đa khi gõ ở ô tìm kiếm. */
export const SUGGESTION_LIMIT = 5;

export const catalogKeys = {
  suggestions: (term: string) => ["catalog", "suggestions", term] as const,
};

/** Sách khớp từ khóa cho ô tìm kiếm (cùng cách tìm với trang `/sach`: theo tên có dấu, ISBN hoặc mã SKU). */
export async function fetchSuggestions(term: string, signal?: AbortSignal): Promise<BookSummary[]> {
  const data = await unwrap(
    browserApi().GET("/api/v1/books", { params: { query: { Q: term, Page: 1, Limit: SUGGESTION_LIMIT } }, signal }),
  );
  return bookPageSchema.parse(data).items;
}
