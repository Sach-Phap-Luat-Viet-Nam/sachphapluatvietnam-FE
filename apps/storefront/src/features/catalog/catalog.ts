import type { paths } from "@slvn/api-client";
import type { BookSummary, CategoryNode } from "./schemas";

export type CatalogParams = Record<string, string | string[] | undefined>;
export type BooksQuery = NonNullable<paths["/api/v1/books"]["get"]["parameters"]["query"]>;

/** Số sách mỗi trang, chia hết cho 2/3/4 cột của lưới. */
export const PAGE_SIZE = 24;
const MAX_QUERY_LENGTH = 200;

export const BOOK_TYPE_LABELS = {
  code: "Bộ luật",
  consolidated: "Văn bản hợp nhất",
  commentary: "Chú giải",
  qna: "Hỏi đáp",
  textbook: "Giáo trình",
  monograph: "Sách chuyên khảo",
} as const;
export const COVER_TYPE_LABELS = { paperback: "Bìa mềm", hardcover: "Bìa cứng" } as const;
export const SORT_LABELS = {
  newest: "Mới nhất",
  price_asc: "Giá: thấp đến cao",
  price_desc: "Giá: cao đến thấp",
} as const;

function hasKey<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.hasOwn(map, key);
}

export function bookTypeLabel(bookType: string): string | undefined {
  return hasKey(BOOK_TYPE_LABELS, bookType) ? BOOK_TYPE_LABELS[bookType] : undefined;
}

export function param(params: CatalogParams, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function nonNegativeInt(value: string): number | undefined {
  if (!/^\d+$/.test(value.trim())) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : undefined;
}

export function currentPage(params: CatalogParams): number {
  const page = nonNegativeInt(param(params, "page"));
  return page && page > 0 ? page : 1;
}

/**
 * Chuyển query string của trang `/sach` thành query của `GET /api/v1/books`. Bỏ giá trị backend sẽ từ chối
 * (400 `VALIDATION_ERROR`) để URL gõ tay hoặc link cũ vẫn mở được trang.
 */
export function toBooksQuery(params: CatalogParams): BooksQuery {
  const query: BooksQuery = { Page: currentPage(params), Limit: PAGE_SIZE };
  const q = param(params, "q").trim().slice(0, MAX_QUERY_LENGTH);
  const category = param(params, "category").trim();
  const type = param(params, "type");
  const cover = param(params, "cover");
  const sort = param(params, "sort");
  let minPrice = nonNegativeInt(param(params, "minPrice"));
  let maxPrice = nonNegativeInt(param(params, "maxPrice"));
  if (minPrice !== undefined && maxPrice !== undefined && maxPrice < minPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  if (q) query.Q = q;
  if (category) query.Category = category;
  if (hasKey(BOOK_TYPE_LABELS, type)) query.Type = type;
  if (hasKey(COVER_TYPE_LABELS, cover)) query.Cover = cover;
  if (hasKey(SORT_LABELS, sort)) query.Sort = sort;
  if (minPrice !== undefined) query.MinPrice = minPrice;
  if (maxPrice !== undefined) query.MaxPrice = maxPrice;
  return query;
}

export function pageCount(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / limit));
}

/** Các số trang hiển thị quanh trang hiện tại. */
export function pageWindow(page: number, count: number, radius = 2): number[] {
  const start = Math.max(1, Math.min(page, count) - radius);
  const end = Math.min(count, Math.max(page, 1) + radius);
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
}

export function catalogHref(params: CatalogParams, changes: Record<string, string>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (typeof value === "string" && value) query.set(key, value);
  for (const [key, value] of Object.entries(changes)) {
    if (value) query.set(key, value);
    else query.delete(key);
  }
  return `/sach${query.size ? `?${query.toString()}` : ""}`;
}

export interface FlatCategory {
  slug: string;
  name: string;
  depth: number;
}

/** Trải cây danh mục thành danh sách theo thứ tự hiển thị, giữ độ sâu để thụt lề. */
export function flattenCategories(nodes: readonly CategoryNode[], depth = 0): FlatCategory[] {
  return nodes.flatMap((node) => [
    { slug: node.slug, name: node.name, depth },
    ...flattenCategories(node.children, depth + 1),
  ]);
}

/** Trạng thái bán hiển thị trên thẻ sách (docs/api_reference.md, mục Catalog). */
export function availabilityLabel(book: Pick<BookSummary, "editionStatus" | "salePrice" | "inStock">): string {
  if (book.editionStatus === "upcoming") return "Sắp phát hành";
  if (book.editionStatus === "discontinued") return "Ngừng bán";
  if (book.salePrice === null) return "Chưa có giá bán";
  return book.inStock ? "Còn hàng" : "Tạm hết hàng";
}
