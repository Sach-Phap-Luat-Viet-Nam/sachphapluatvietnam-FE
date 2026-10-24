import type { OrderListQuery } from "./api";
import type { OrderFilterFormValues } from "./schemas";

/**
 * Chuẩn hóa ô tìm cho backend (tìm **đúng** mã đơn hoặc **đúng** số điện thoại): số điện thoại bỏ khoảng trắng và dấu
 * chấm (`0901 234.567` → `0901234567`), mã đơn viết hoa (`slvn2610230001` → `SLVN2610230001`).
 */
export function normalizeOrderSearch(raw: string): string {
  const value = raw.trim();
  return /^[\d\s.+]+$/.test(value) ? value.replace(/[\s.]/g, "") : value.toUpperCase();
}

/** Giá trị form lọc → query gửi backend, luôn về trang 1. */
export function toOrderQuery(values: OrderFilterFormValues): OrderListQuery {
  return {
    status: values.status,
    paymentMethod: values.paymentMethod,
    from: values.from,
    to: values.to,
    q: normalizeOrderSearch(values.q),
    page: 1,
  };
}

/** Số bộ lọc đang bật (không tính trang), để hiện "Không có đơn phù hợp" thay vì "Chưa có đơn". */
export function activeFilterCount(query: OrderListQuery): number {
  return [query.status, query.paymentMethod, query.from, query.to, query.q].filter(Boolean).length;
}
