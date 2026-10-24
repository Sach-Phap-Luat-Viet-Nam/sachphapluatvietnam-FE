import type { StockCard } from "./schemas";

/**
 * Link của chứng từ trong thẻ kho: `GR-{id}` → phiếu nhập; mã đơn `SLVN...` → chi tiết đơn (khi được vào phần Đơn hàng).
 * Chứng từ khác (`ISSUE-...` của xuất thủ công) không có trang riêng.
 */
export function referenceHref(reference: string | null, canSeeOrders: boolean): string | null {
  if (!reference) {
    return null;
  }
  const receipt = /^GR-(\d+)$/.exec(reference);
  if (receipt) {
    return `/kho/phieu-nhap/${receipt[1]}`;
  }
  return canSeeOrders && /^SLVN[0-9A-Z]+$/.test(reference) ? `/don-hang/${reference}` : null;
}

/** Mã lô của một dòng thẻ kho; lô không còn trong danh sách thì hiện id. */
export function batchLabel(batches: StockCard["batches"], printBatchId: number | null): string | null {
  if (printBatchId === null) {
    return null;
  }
  return batches.find((batch) => batch.id === printBatchId)?.batchCode ?? `Lô #${printBatchId}`;
}

/** Tồn khả dụng đã chạm ngưỡng. SKU chưa từng nhập (không có lô) không tính, giống danh sách tồn thấp của backend. */
export function isLowStock(card: Pick<StockCard, "available" | "lowStockThreshold" | "batches">): boolean {
  return card.batches.length > 0 && card.available <= card.lowStockThreshold;
}
