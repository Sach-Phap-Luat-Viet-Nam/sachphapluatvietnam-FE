import { vnDateKey } from "@slvn/utils";
import type { OrderListQuery } from "./api";
import { orderFilterFormSchema } from "./schemas";
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

type FilterField = "from" | "to" | "q";

/**
 * Giá trị bộ lọc trên màn hình → query gửi backend kèm lỗi theo ô. Lọc tự áp khi gõ nên ô sai (ngày gõ dở, khoảng ngày
 * ngược) chỉ bị bỏ khỏi query và hiện lỗi, các ô còn lại vẫn lọc bình thường.
 */
export function resolveOrderQuery(
  values: OrderFilterFormValues,
  page: number,
): { query: OrderListQuery; errors: Partial<Record<FilterField, string>> } {
  const errors: Partial<Record<FilterField, string>> = {};
  const result = orderFilterFormSchema.safeParse(values);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if ((field === "from" || field === "to" || field === "q") && !errors[field]) {
        errors[field] = issue.message;
      }
    }
  }
  return {
    query: {
      status: values.status,
      paymentMethod: values.paymentMethod,
      from: errors.from ? "" : values.from,
      to: errors.to ? "" : values.to,
      q: errors.q ? "" : normalizeOrderSearch(values.q),
      page,
    },
    errors,
  };
}

/** Khoảng `days` ngày gần nhất tính cả hôm nay, theo giờ Việt Nam (`1` = hôm nay): hai đầu dạng `YYYY-MM-DD`. */
export function recentDaysRange(days: number, now: Date = new Date()): { from: string; to: string } {
  const DAY_MS = 24 * 60 * 60 * 1000;
  return { from: vnDateKey(new Date(now.getTime() - (days - 1) * DAY_MS)), to: vnDateKey(now) };
}
