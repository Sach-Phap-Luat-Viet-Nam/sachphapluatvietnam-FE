"use client";

import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchLowStock, inventoryKeys } from "./api";

/**
 * Số SKU tồn thấp cho thẻ "Kho" ở trang Tổng quan, dùng chung cache với trang 1 của danh sách tồn thấp. Lỗi hoặc đang
 * tải thì không hiện gì.
 */
export function LowStockCount() {
  const lowStock = useQuery({ queryKey: inventoryKeys.lowStock(1), queryFn: () => fetchLowStock(1) });
  if (!lowStock.data) return null;
  const { total } = lowStock.data.meta;
  return (
    <StatusBadge tone={total > 0 ? "warning" : "neutral"}>
      {total > 0 ? `${total} SKU tồn thấp` : "Không có SKU tồn thấp"}
    </StatusBadge>
  );
}
