import type { BooksQuery } from "@slvn/api-client";
import { formatPrice } from "@slvn/utils";
import type { BookSummary, CategoryNode } from "./schemas";

export type { BooksQuery };
export type CatalogParams = Record<string, string | string[] | undefined>;

/** Slug hợp lệ của backend: chữ thường không dấu, số, gạch nối. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Số sách mỗi trang, chia hết cho 2/3/4 cột của lưới. */
export const PAGE_SIZE = 24;
const MAX_QUERY_LENGTH = 200;
/** Giới hạn độ dài `legalDocument` của `GET /api/v1/books`. */
const MAX_LEGAL_DOCUMENT_LENGTH = 50;

/** Giá trị `onSale` trên URL khi bật lọc "Đang giảm giá". */
export const ON_SALE_VALUE = "1";

export const BOOK_TYPE_LABELS = {
  code: "Bộ luật",
  consolidated: "Văn bản hợp nhất",
  commentary: "Chú giải",
  qna: "Hỏi đáp",
  textbook: "Giáo trình",
  monograph: "Sách chuyên khảo",
} as const;
export const SORT_LABELS = {
  newest: "Mới phát hành",
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
  const sort = param(params, "sort");
  // Quá 50 ký tự backend trả 400 nên bỏ hẳn thay vì cắt (cắt ra số hiệu khác là lọc sai).
  const legalDocument = param(params, "legalDocument").trim();
  const author = param(params, "author").trim();
  let minPrice = nonNegativeInt(param(params, "minPrice"));
  let maxPrice = nonNegativeInt(param(params, "maxPrice"));
  if (minPrice !== undefined && maxPrice !== undefined && maxPrice < minPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  if (q) query.Q = q;
  if (category) query.Category = category;
  if (hasKey(BOOK_TYPE_LABELS, type)) query.Type = type;
  if (hasKey(SORT_LABELS, sort)) query.Sort = sort;
  if (minPrice !== undefined) query.MinPrice = minPrice;
  if (maxPrice !== undefined) query.MaxPrice = maxPrice;
  if (legalDocument && legalDocument.length <= MAX_LEGAL_DOCUMENT_LENGTH) query.LegalDocument = legalDocument;
  if (isOnSaleParam(param(params, "onSale"))) query.OnSale = true;
  if (SLUG_PATTERN.test(author)) query.Author = author;
  return query;
}

/** Link tủ sách lọc theo tác giả (trang "Sách của tác giả"). */
export function authorHref(slug: string): string {
  return catalogHref({}, { author: slug });
}

/** Nhận cả giá trị form gửi lên lẫn `true` (link gõ tay theo tên tham số của API). */
function isOnSaleParam(value: string): boolean {
  return value === ON_SALE_VALUE || value === "true";
}

/** Link tủ sách lọc theo một văn bản pháp luật (số hiệu như `91/2015/QH13`). */
export function legalDocumentHref(docNumber: string): string {
  return catalogHref({}, { legalDocument: docNumber });
}

/** Số ký tự tối thiểu trước khi gợi ý khi gõ: 1 ký tự khớp quá nhiều sách, gợi ý không có ích. */
const MIN_SUGGEST_LENGTH = 2;

/** Từ khóa gửi đi để gợi ý khi gõ, `null` khi quá ngắn (không gọi API). */
export function suggestionTerm(raw: string): string | null {
  const term = raw.trim().slice(0, MAX_QUERY_LENGTH);
  return term.length >= MIN_SUGGEST_LENGTH ? term : null;
}

/**
 * Gợi ý được chọn sau khi bấm mũi tên (`step` = 1 xuống, -1 lên) trong danh sách `count` gợi ý. `-1` là đang ở ô nhập:
 * đi quá gợi ý cuối thì về ô nhập, lên từ ô nhập thì tới gợi ý cuối (vòng như ô tìm kiếm của trình duyệt).
 */
export function nextSuggestionIndex(current: number, step: 1 | -1, count: number): number {
  if (count <= 0) return -1;
  const slots = count + 1;
  return ((current + 1 + step + slots) % slots) - 1;
}

/** Bỏ cuốn đang xem khỏi danh sách gợi ý rồi cắt còn `limit` cuốn. */
export function withoutBook<T extends { id: number }>(books: readonly T[], bookId: number, limit: number): T[] {
  return books.filter((book) => book.id !== bookId).slice(0, limit);
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

export type AvailabilityTone = "ok" | "upcoming" | "muted";

export interface Availability {
  label: string;
  tone: AvailabilityTone;
}

/** Trạng thái bán hiển thị trên thẻ sách (docs/api_reference.md, mục Catalog). */
export function availability(book: Pick<BookSummary, "editionStatus" | "salePrice" | "inStock">): Availability {
  if (book.editionStatus === "upcoming") return { label: "Sắp phát hành", tone: "upcoming" };
  if (book.editionStatus === "discontinued") return { label: "Ngừng bán", tone: "muted" };
  if (book.salePrice === null) return { label: "Chưa có giá bán", tone: "muted" };
  return book.inStock ? { label: "Còn hàng", tone: "ok" } : { label: "Tạm hết hàng", tone: "muted" };
}

export interface PriceRange {
  label: string;
  min?: number;
  max?: number;
}

/** Mức giá chọn nhanh; mốc 300.000đ trùng ngưỡng miễn phí vận chuyển (BR-14). */
export const PRICE_RANGES: readonly PriceRange[] = [
  { label: "Dưới 150.000đ", max: 150000 },
  { label: "150.000 – 300.000đ", min: 150000, max: 300000 },
  { label: "Từ 300.000đ", min: 300000 },
];

function queryNumber(value: number | string | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function priceRangeHref(params: CatalogParams, range: PriceRange): string {
  return catalogHref(params, {
    minPrice: range.min === undefined ? "" : String(range.min),
    maxPrice: range.max === undefined ? "" : String(range.max),
    page: "",
  });
}

export function isPriceRangeActive(params: CatalogParams, range: PriceRange): boolean {
  const query = toBooksQuery(params);
  return queryNumber(query.MinPrice) === range.min && queryNumber(query.MaxPrice) === range.max;
}

function priceLabel(min: number | undefined, max: number | undefined): string | undefined {
  if (min !== undefined && max !== undefined) return `${formatPrice(min)} – ${formatPrice(max)}`;
  if (min !== undefined) return `Từ ${formatPrice(min)}`;
  if (max !== undefined) return `Đến ${formatPrice(max)}`;
  return undefined;
}

export interface ActiveFilter {
  key: string;
  label: string;
  /** Link bỏ riêng bộ lọc này, giữ các bộ lọc khác. */
  removeHref: string;
}

/** Các bộ lọc đang áp dụng (đã chuẩn hóa như khi gọi API), dùng cho dòng "Đang lọc". */
export function activeFilters(
  params: CatalogParams,
  categories: readonly FlatCategory[],
  /** Tên tác giả đang lọc (API không có endpoint tra tên theo slug công khai), không có thì hiện slug. */
  authorName?: string,
): ActiveFilter[] {
  const query = toBooksQuery(params);
  const remove = (...keys: string[]) =>
    catalogHref(params, Object.fromEntries([...keys.map((key) => [key, ""]), ["page", ""]]));
  const filters: ActiveFilter[] = [];

  if (query.Category) {
    const name = categories.find((category) => category.slug === query.Category)?.name ?? query.Category;
    filters.push({ key: "category", label: name, removeHref: remove("category") });
  }
  if (query.Type && hasKey(BOOK_TYPE_LABELS, query.Type)) {
    filters.push({ key: "type", label: BOOK_TYPE_LABELS[query.Type], removeHref: remove("type") });
  }
  const price = priceLabel(queryNumber(query.MinPrice), queryNumber(query.MaxPrice));
  if (price) filters.push({ key: "price", label: price, removeHref: remove("minPrice", "maxPrice") });
  if (query.Author) {
    filters.push({ key: "author", label: `Tác giả: ${authorName ?? query.Author}`, removeHref: remove("author") });
  }
  if (query.OnSale) filters.push({ key: "onSale", label: "Đang giảm giá", removeHref: remove("onSale") });
  if (query.LegalDocument) {
    filters.push({
      key: "legalDocument",
      label: `Văn bản ${query.LegalDocument}`,
      removeHref: remove("legalDocument"),
    });
  }
  if (query.Q) filters.push({ key: "q", label: `“${query.Q}”`, removeHref: remove("q") });
  return filters;
}

export interface SubcategoryGroup {
  parent: { slug: string; name: string };
  items: { slug: string; name: string; active: boolean }[];
}

/**
 * Danh mục con cần hiện dưới thanh danh mục: con của danh mục gốc đang chọn, hoặc các danh mục cùng cấp khi đang
 * chọn một danh mục con. `null` khi không có danh mục con nào.
 */
export function subcategoryGroup(tree: readonly CategoryNode[], activeSlug: string): SubcategoryGroup | null {
  if (!activeSlug) return null;
  const search = (nodes: readonly CategoryNode[], parent: CategoryNode | null): SubcategoryGroup | null => {
    for (const node of nodes) {
      if (node.slug === activeSlug) {
        const owner = node.children.length ? node : parent;
        if (!owner?.children.length) return null;
        return {
          parent: { slug: owner.slug, name: owner.name },
          items: owner.children.map((child) => ({
            slug: child.slug,
            name: child.name,
            active: child.slug === activeSlug,
          })),
        };
      }
      const found = search(node.children, node);
      if (found) return found;
    }
    return null;
  };
  return search(tree, null);
}

/** Slug danh mục gốc chứa `slug` (chính nó nếu là gốc), để tô sáng trên thanh danh mục. */
export function rootCategorySlug(tree: readonly CategoryNode[], slug: string): string | undefined {
  const contains = (node: CategoryNode): boolean =>
    node.slug === slug || node.children.some((child) => contains(child));
  return tree.find((root) => contains(root))?.slug;
}
