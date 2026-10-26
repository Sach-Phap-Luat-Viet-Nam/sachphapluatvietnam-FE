import { unwrap } from "@slvn/api-client";
import { browserApi } from "@slvn/auth";
import { pageSchema } from "@/lib/page-schema";
import type { Page } from "@/lib/page-schema";
import type { IssueBody, ReceiptBody } from "./forms";
import { lowStockSchema, receiptSchema, skuSearchResultSchema, stockCardSchema } from "./schemas";
import type { LowStock, Receipt, SkuSearchResult, StockCard } from "./schemas";

// API "Admin — Kho" (docs/api_reference.md), quyền `super_admin`, `warehouse_keeper`; duyệt/từ chối phiếu chỉ
// `super_admin` (duyệt được cả phiếu do chính mình lập). Gọi qua proxy `/api/v1`.

export const RECEIPTS_PAGE_SIZE = 20;
export const LOW_STOCK_PAGE_SIZE = 50;
/** Số SKU gợi ý khi tìm. */
const SKU_SEARCH_LIMIT = 8;

const receiptPageSchema = pageSchema(receiptSchema);
const lowStockPageSchema = pageSchema(lowStockSchema);
const skuSearchSchema = skuSearchResultSchema.array();

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

/** Sửa phiếu nháp: thay ghi chú và toàn bộ dòng; chỉ người lập hoặc Super Admin. */
export async function updateReceipt(id: number, body: ReceiptBody): Promise<Receipt> {
  const data = await unwrap(
    browserApi().PUT("/api/v1/admin/inventory/receipts/{id}", { params: { path: { id } }, body: { ...body } }),
  );
  return receiptSchema.parse(data);
}

/** Xóa phiếu nháp (chưa ảnh hưởng tồn kho); phiếu đã duyệt hoặc từ chối không xóa được. */
export async function deleteReceipt(id: number): Promise<void> {
  await unwrap(browserApi().DELETE("/api/v1/admin/inventory/receipts/{id}", { params: { path: { id } } }));
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

/** Tìm SKU theo một phần tên sách, mã SKU hoặc ISBN, kèm tồn khả dụng; thủ kho dùng được. */
export async function searchSkus(q: string): Promise<SkuSearchResult[]> {
  const data = await unwrap(
    browserApi().GET("/api/v1/admin/inventory/sku-search", { params: { query: { Q: q, Limit: SKU_SEARCH_LIMIT } } }),
  );
  return skuSearchSchema.parse(data);
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
  skuSearch: (q: string) => ["inventory", "sku-search", q] as const,
};
