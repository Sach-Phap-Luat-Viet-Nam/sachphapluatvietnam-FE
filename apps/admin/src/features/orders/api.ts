import { unwrap } from "@slvn/api-client";
import { z } from "zod";
import { browserApi } from "@slvn/auth";
import { pageSchema } from "@/lib/page-schema";
import { adminOrderSchema, orderSummarySchema } from "./schemas";
import type { AdminOrder } from "./schemas";

// API "Admin — Đơn hàng" (docs/api_reference.md): xem đơn với policy `orders_read` (super_admin, order_manager,
// customer_service, accountant), đổi trạng thái với `orders_manage` (super_admin, order_manager). Gọi qua proxy `/api/v1`.

export const ORDERS_PAGE_SIZE = 20;

const orderPageSchema = pageSchema(orderSummarySchema).extend({
  statistics: z.object({ revenue: z.number(), booksSold: z.number() }).optional(),
});

function orderFilters(query: OrderListQuery) {
  return {
    Status: query.status || undefined,
    PaymentMethod: query.paymentMethod || undefined,
    From: query.from || undefined,
    To: query.to || undefined,
    Q: query.q || undefined,
  };
}

/** Xuất toàn bộ kết quả theo bộ lọc, không giới hạn theo trang hiện tại. */
export async function exportOrders(query: OrderListQuery): Promise<{ blob: Blob; filename: string }> {
  const result = await browserApi().GET("/api/v1/admin/orders/export", {
    params: { query: orderFilters(query) },
    parseAs: "blob",
  });
  const blob = await unwrap(Promise.resolve(result));
  if (!blob) throw new Error("Không nhận được file Excel. Vui lòng thử lại.");
  return { blob, filename: exportFileName(result.response.headers.get("Content-Disposition"), query) };
}

function exportFileName(disposition: string | null, query: OrderListQuery): string {
  const encoded = disposition?.match(/(?:^|;)\s*filename\*\s*=\s*UTF-8'[^']*'([^;]+)/i);
  if (encoded?.[1]) {
    try {
      const filename = decodeURIComponent(encoded[1].trim());
      if (filename) return filename;
    } catch {
      // A malformed encoded name can still have a valid plain filename below.
    }
  }
  const plain = disposition?.match(/(?:^|;)\s*filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
  const filename = (plain?.[1] ?? plain?.[2])?.trim();
  if (filename) return filename;

  // Older backends/proxies may omit the header; keep the download descriptive in that case too.
  const period = [query.from && `Tu-${query.from}`, query.to && `Den-${query.to}`].filter(Boolean).join("_");
  const exportedAt = new Date(Date.now() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", "_")
    .replaceAll(":", "-");
  return `Sach-Luat-Viet-Nam_Bao-cao-don-hang_${period || "Tat-ca-thoi-gian"}_Xuat-${exportedAt}.xlsx`;
}

export interface OrderListQuery {
  status: string;
  paymentMethod: string;
  /** Ngày tạo theo giờ Việt Nam, `YYYY-MM-DD`, tính cả hai đầu. */
  from: string;
  to: string;
  /** Đúng mã đơn hoặc đúng số điện thoại. */
  q: string;
  page: number;
}

export const EMPTY_ORDER_QUERY: OrderListQuery = { status: "", paymentMethod: "", from: "", to: "", q: "", page: 1 };

/** Danh sách đơn, mới nhất trước. Ô lọc trống thì không gửi. */
export async function fetchOrders(query: OrderListQuery): Promise<z.infer<typeof orderPageSchema>> {
  const data = await unwrap(
    browserApi().GET("/api/v1/admin/orders", {
      params: {
        query: {
          ...orderFilters(query),
          Page: query.page,
          Limit: ORDERS_PAGE_SIZE,
        },
      },
    }),
  );
  return orderPageSchema.parse(data);
}

export async function fetchOrder(code: string): Promise<AdminOrder> {
  const data = await unwrap(browserApi().GET("/api/v1/admin/orders/{code}", { params: { path: { code } } }));
  return adminOrderSchema.parse(data);
}

/** Đổi trạng thái theo bảng 16.1; sai bảng (người khác vừa đổi) → `ORDER_INVALID_TRANSITION`. */
export async function changeOrderStatus(
  code: string,
  body: { status: string; note: string | null },
): Promise<AdminOrder> {
  const data = await unwrap(
    browserApi().POST("/api/v1/admin/orders/{code}/status", {
      params: { path: { code } },
      body: {
        ...body,
        // @ts-expect-error OpenAPI sinh enum `OrderStatus` thành number; backend nhận chuỗi snake_case.
        status: body.status,
      },
    }),
  );
  return adminOrderSchema.parse(data);
}

/** Khóa TanStack Query của Đơn hàng; đổi trạng thái xong thì invalidate danh sách. */
export const orderKeys = {
  all: ["orders"] as const,
  list: (query: OrderListQuery) => ["orders", "list", query] as const,
  lists: ["orders", "list"] as const,
  detail: (code: string) => ["orders", "detail", code] as const,
};
