import { z } from "zod";
import { isRealDate } from "@/lib/vn-date";
import { ORDER_STATUSES, PAYMENT_METHOD_FILTERS } from "./labels";

// Response theo docs/api_reference.md, mục "Đặt hàng" và "Admin — Đơn hàng". OpenAPI sinh enum thành `number` và số
// thành `number | string`, lệch với JSON thật nên parse bằng Zod.

const addressSchema = z.object({ province: z.string(), ward: z.string(), streetAddress: z.string() });

export const orderSchema = z.object({
  orderCode: z.string(),
  status: z.string(),
  paymentMethod: z.string(),
  paymentStatus: z.string(),
  customerName: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  shippingAddress: addressSchema,
  items: z.array(
    z.object({
      skuId: z.number(),
      skuCode: z.string(),
      bookTitle: z.string(),
      editionName: z.string().nullable(),
      isbn: z.string().nullable(),
      coverType: z.string(),
      unitPrice: z.number(),
      quantity: z.number(),
      lineTotal: z.number(),
    }),
  ),
  subtotal: z.number(),
  discount: z.number(),
  shippingFee: z.number(),
  total: z.number(),
  invoiceRequired: z.boolean(),
  invoiceInfo: z
    .object({ companyName: z.string(), taxCode: z.string(), address: z.string(), email: z.string() })
    .nullable(),
  note: z.string().nullable(),
  paymentExpiresAt: z.string().nullable(),
  canCancel: z.boolean(),
  createdAt: z.string(),
  history: z.array(
    z.object({
      fromStatus: z.string().nullable(),
      toStatus: z.string(),
      note: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});
export type Order = z.infer<typeof orderSchema>;

export const adminOrderSchema = z.object({
  order: orderSchema,
  /** `null` với đơn của khách vãng lai. */
  userId: z.number().nullable(),
  /** Trạng thái backend chấp nhận ở bước kế tiếp: chỉ dựng nút từ danh sách này. */
  nextStatuses: z.array(z.string()),
  /** Tổng giá vốn theo lô đã xuất, có từ khi đóng gói. */
  costOfGoods: z.number().nullable(),
  /**
   * Trạng thái chuyển nhanh được (cách từ hai bước trên luồng chính) kèm các bước sẽ đi qua; gửi `status` đó là backend
   * đi đủ các bước. Backend bản cũ chưa có thì coi như rỗng.
   */
  fastForward: z.array(z.object({ status: z.string(), steps: z.array(z.string()) })).default([]),
});
export type AdminOrder = z.infer<typeof adminOrderSchema>;

export const orderSummarySchema = z.object({
  orderCode: z.string(),
  status: z.string(),
  paymentMethod: z.string(),
  paymentStatus: z.string(),
  customerName: z.string(),
  phone: z.string(),
  /** Tổng số cuốn. */
  itemCount: z.number(),
  total: z.number(),
  createdAt: z.string(),
});
export type OrderSummary = z.infer<typeof orderSummarySchema>;

// Form

const optionalDate = z.string().refine((value) => value === "" || isRealDate(value), "Nhập ngày theo dạng dd/mm/yyyy.");

export const orderFilterFormSchema = z
  .object({
    status: z.union([z.literal(""), z.enum(ORDER_STATUSES)]),
    paymentMethod: z.union([z.literal(""), z.enum(PAYMENT_METHOD_FILTERS)]),
    from: optionalDate,
    to: optionalDate,
    q: z.string().trim().max(50, "Tối đa 50 ký tự."),
  })
  .superRefine(({ from, to }, ctx) => {
    if (from && to && isRealDate(from) && isRealDate(to) && to < from) {
      ctx.addIssue({ code: "custom", path: ["to"], message: "Ngày kết thúc phải từ ngày bắt đầu trở đi." });
    }
  });
export type OrderFilterFormValues = z.infer<typeof orderFilterFormSchema>;

export const statusChangeFormSchema = z.object({ note: z.string().trim().max(1000, "Tối đa 1000 ký tự.") });
export type StatusChangeFormValues = z.infer<typeof statusChangeFormSchema>;
