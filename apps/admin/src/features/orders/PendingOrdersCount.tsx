"use client";

import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/components/StatusBadge";
import { EMPTY_ORDER_QUERY, fetchOrders, orderKeys } from "./api";
import type { OrderListQuery } from "./api";

const PENDING_QUERY: OrderListQuery = { ...EMPTY_ORDER_QUERY, status: "pending_confirm" };

/**
 * Số đơn chờ xác nhận cho thẻ "Đơn hàng" ở trang Tổng quan. Dùng chung query key với danh sách đơn đang lọc trạng thái
 * này nên đổi trạng thái đơn (invalidate `orderKeys.lists`) là số tự cập nhật. Lỗi hoặc đang tải thì không hiện gì: số
 * đếm chỉ là phần thêm của lối tắt.
 */
export function PendingOrdersCount() {
  const orders = useQuery({ queryKey: orderKeys.list(PENDING_QUERY), queryFn: () => fetchOrders(PENDING_QUERY) });
  if (!orders.data) return null;
  const { total } = orders.data.meta;
  return (
    <StatusBadge tone={total > 0 ? "warning" : "neutral"}>
      {total > 0 ? `${total} đơn chờ xác nhận` : "Không có đơn chờ xác nhận"}
    </StatusBadge>
  );
}
