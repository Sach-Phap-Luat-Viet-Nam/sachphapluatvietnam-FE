import { unwrap } from "@slvn/api-client";
import { browserApi } from "@slvn/auth";
import { pageSchema } from "@/lib/page-schema";
import type { Page } from "@/lib/page-schema";
import type { IssueBody, ReceiptBody } from "./forms";
import { bookOptionSchema, bookSkusSchema, lowStockSchema, receiptSchema, stockCardSchema } from "./schemas";
import type { BookOption, BookSkus, LowStock, Receipt, StockCard } from "./schemas";

// API "Admin — Kho" (docs/api_reference.md), quyền `super_admin`, `warehouse_keeper`; duyệt/từ chối phiếu chỉ
// `super_admin` và người duyệt phải khác người lập. Gọi qua proxy `/api/v1`.

export const RECEIPTS_PAGE_SIZE = 20;
export const LOW_STOCK_PAGE_SIZE = 50;
/** Số đầu sách gợi ý khi tìm SKU. */
const BOOK_OPTIONS_LIMIT = 8;

const receiptPageSchema = pageSchema(receiptSchema);
const lowStockPageSchema = pageSchema(lowStockSchema);
const bookOptionPageSchema = pageSchema(bookOptionSchema);

export interface ReceiptListQuery {
  status: string;
  page: number;
}

/** Phiếu nhập, mới nhất trước; `status` rỗng = mọi trạng thái. */
export async function fetchReceipts({ status, page }: ReceiptListQuery): Promise<Page<Receipt>> {
  const data = await unwrap(
    browserApi().GET("/api/v1/admin/inventory/receipts", {
      params: { query: { Status: status || undefined, Page: page, Limit: RECEIPTS_PAGE_SIZE } },
    }),
  );
  return receiptPageSchema.parse(data);
}

export async function fetchReceipt(id: number): Promise<Receipt> {
  const data = await unwrap(browserApi().GET("/api/v1/admin/inventory/receipts/{id}", { params: { path: { id } } }));
  return receiptSchema.parse(data);
}

/** Lập phiếu nháp; tồn chỉ tăng khi phiếu được duyệt. */
export async function createReceipt(body: ReceiptBody): Promise<Receipt> {
  return receiptSchema.parse(await unwrap(browserApi().POST("/api/v1/admin/inventory/receipts", { body })));
}

export async function approveReceipt(id: number): Promise<Receipt> {
  const data = await unwrap(
    browserApi().POST("/api/v1/admin/inventory/receipts/{id}/approve", { params: { path: { id } } }),
  );
  return receiptSchema.parse(data);
}

export async function rejectReceipt(id: number, reason: string): Promise<Receipt> {
  const data = await unwrap(
    browserApi().POST("/api/v1/admin/inventory/receipts/{id}/reject", {
      params: { path: { id } },
      body: { reason },
    }),
  );
  return receiptSchema.parse(data);
}

/** Thẻ kho: tồn, lô in theo thứ tự xuất FIFO, 100 dòng nhập/xuất gần nhất. SKU chưa từng nhập vẫn mở được (tồn 0). */
export async function fetchStockCard(skuId: number): Promise<StockCard> {
  const data = await unwrap(browserApi().GET("/api/v1/admin/inventory/skus/{skuId}", { params: { path: { skuId } } }));
  return stockCardSchema.parse(data);
}

export async function setLowStockThreshold(skuId: number, body: { lowStockThreshold: number }): Promise<StockCard> {
  const data = await unwrap(
    browserApi().PUT("/api/v1/admin/inventory/skus/{skuId}/threshold", { params: { path: { skuId } }, body }),
  );
  return stockCardSchema.parse(data);
}

/** SKU có tồn khả dụng ≤ ngưỡng, tồn thấp nhất trước. */
export async function fetchLowStock(page: number): Promise<Page<LowStock>> {
  const data = await unwrap(
    browserApi().GET("/api/v1/admin/inventory/low-stock", {
      params: { query: { Page: page, Limit: LOW_STOCK_PAGE_SIZE } },
    }),
  );
  return lowStockPageSchema.parse(data);
}

/** Xuất thủ công (hủy hàng lỗi, biếu tặng) theo FIFO; vượt tồn khả dụng → `OUT_OF_STOCK`. */
export async function issueStock(body: IssueBody): Promise<StockCard> {
  const data = await unwrap(
    browserApi().POST("/api/v1/admin/inventory/issues", {
      body: {
        ...body,
        // @ts-expect-error OpenAPI sinh enum `IssueType` thành number; backend nhận chuỗi snake_case.
        type: body.type,
      },
    }),
  );
  return stockCardSchema.parse(data);
}

// Tìm SKU: backend chưa có API tìm SKU nên đi qua API Catalog (policy `catalog_admin`). Vai trò không có quyền
// Catalog (thủ kho) sẽ nhận 403.

/** Đầu sách khớp tên, slug hoặc ISBN. */
export async function searchBookOptions(q: string): Promise<BookOption[]> {
  const data = await unwrap(
    browserApi().GET("/api/v1/admin/books", { params: { query: { Q: q, Page: 1, Limit: BOOK_OPTIONS_LIMIT } } }),
  );
  return bookOptionPageSchema.parse(data).items;
}

/** Các ấn bản và SKU của một đầu sách. */
export async function fetchBookSkus(bookId: number): Promise<BookSkus> {
  const data = await unwrap(browserApi().GET("/api/v1/admin/books/{id}", { params: { path: { id: bookId } } }));
  return bookSkusSchema.parse(data);
}

/** Khóa TanStack Query của Kho; thao tác ghi xong thì invalidate theo tiền tố. */
export const inventoryKeys = {
  all: ["inventory"] as const,
  receipts: (query: ReceiptListQuery) => ["inventory", "receipts", query] as const,
  receiptLists: ["inventory", "receipts"] as const,
  receipt: (id: number) => ["inventory", "receipt", id] as const,
  stockCard: (skuId: number) => ["inventory", "stock-card", skuId] as const,
  lowStock: (page: number) => ["inventory", "low-stock", page] as const,
  lowStockLists: ["inventory", "low-stock"] as const,
  bookOptions: (q: string) => ["inventory", "book-options", q] as const,
  bookSkus: (bookId: number) => ["inventory", "book-skus", bookId] as const,
};
