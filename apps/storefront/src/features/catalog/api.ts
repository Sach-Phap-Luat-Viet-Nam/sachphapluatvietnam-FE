import "server-only";
import { cache } from "react";
import { isApiError, unwrap } from "@slvn/api-client";
import { serverApi } from "@/lib/api";
import type { BooksQuery } from "./catalog";
import { bookDetailSchema, bookPageSchema, categoryNodeSchema } from "./schemas";
import type { BookDetail, BookPage, CategoryNode } from "./schemas";

export async function getBooks(query: BooksQuery): Promise<BookPage> {
  const data = await unwrap(serverApi.GET("/api/v1/books", { params: { query } }));
  return bookPageSchema.parse(data);
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const data = await unwrap(serverApi.GET("/api/v1/categories"));
  return categoryNodeSchema.array().parse(data);
}

/**
 * Chi tiết sách theo slug, `null` khi backend trả 404 (không có hoặc đang ẩn). Bọc `cache` để `generateMetadata` và
 * trang dùng chung một request.
 */
export const getBook = cache(async (slug: string): Promise<BookDetail | null> => {
  try {
    const data = await unwrap(serverApi.GET("/api/v1/books/{slug}", { params: { path: { slug } } }));
    return bookDetailSchema.parse(data);
  } catch (error) {
    if (isApiError(error) && error.status === 404) {
      return null;
    }
    throw error;
  }
});
