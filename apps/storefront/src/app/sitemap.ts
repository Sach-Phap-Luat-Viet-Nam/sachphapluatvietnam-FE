import type { MetadataRoute } from "next";
import { getBooks } from "@/features/catalog/api";
import type { BookSummary } from "@/features/catalog/schemas";
import { getCombos } from "@/features/combo/api";
import { env } from "@/lib/env";
import { sitemapEntries } from "@/lib/sitemap";

/** `limit` tối đa của `GET /api/v1/books`. */
const BOOKS_PER_REQUEST = 100;
/** Chặn vòng lặp nếu `meta.total` sai; 50 trang = 5.000 sách, còn xa giới hạn 50.000 URL của một sitemap. */
const MAX_BOOK_PAGES = 50;

/**
 * Đọc hết tủ sách theo từng trang. Backend lỗi giữa chừng thì giữ các trang đã đọc: sitemap thiếu vài sách vẫn hơn
 * sitemap lỗi, và được dựng lại khi cache dữ liệu catalog hết hạn.
 */
async function loadAllBooks(): Promise<BookSummary[]> {
  const books: BookSummary[] = [];
  try {
    for (let page = 1; page <= MAX_BOOK_PAGES; page++) {
      const result = await getBooks({ Page: page, Limit: BOOKS_PER_REQUEST });
      books.push(...result.items);
      if (!result.items.length || page * BOOKS_PER_REQUEST >= result.meta.total) break;
    }
  } catch (error) {
    console.error("Không tải đủ danh sách sách cho sitemap", error);
  }
  return books;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [books, combos] = await Promise.all([loadAllBooks(), getCombos()]);
  return sitemapEntries(env.SITE_URL, books, combos ?? []);
}
