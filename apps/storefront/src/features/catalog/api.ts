import "server-only";
import { unwrap } from "@slvn/api-client";
import { serverApi } from "@/lib/api";
import type { BooksQuery } from "./catalog";
import { bookPageSchema, categoryNodeSchema } from "./schemas";
import type { BookPage, CategoryNode } from "./schemas";

export async function getBooks(query: BooksQuery): Promise<BookPage> {
  const data = await unwrap(serverApi.GET("/api/v1/books", { params: { query } }));
  return bookPageSchema.parse(data);
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const data = await unwrap(serverApi.GET("/api/v1/categories"));
  return categoryNodeSchema.array().parse(data);
}
