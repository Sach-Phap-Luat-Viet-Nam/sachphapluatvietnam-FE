import { z } from "zod";
import { appliedPromotionSchema } from "./checkout-preview";

// OpenAPI sinh số thành `number | string` và enum thành `number`, lệch với JSON backend thật trả (số nguyên, enum
// snake_case). Parse theo docs/api_reference.md, mục Giỏ hàng và Đặt hàng.

export const cartItemSchema = z.object({
  skuId: z.number(),
  skuCode: z.string(),
  bookTitle: z.string(),
  bookSlug: z.string(),
  editionName: z.string().nullable(),
  coverType: z.string(),
  coverImageUrl: z.string().nullable(),
  quantity: z.number(),
  unitPrice: z.number(),
  listPrice: z.number(),
  lineTotal: z.number(),
  isLatestEdition: z.boolean(),
  isSellable: z.boolean(),
  availableQuantity: z.number(),
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const cartSchema = z.object({
  items: z.array(cartItemSchema),
  totalQuantity: z.number(),
  subtotal: z.number(),
});
export type Cart = z.infer<typeof cartSchema>;

export const EMPTY_CART: Cart = { items: [], totalQuantity: 0, subtotal: 0 };

export const shippingQuoteSchema = z.object({
  shippingFee: z.number(),
  /** `null`: shop không có miễn ship theo ngưỡng. */
  freeShippingThreshold: z.number().nullable(),
});
export type ShippingQuote = z.infer<typeof shippingQuoteSchema>;

const shippingAddressSchema = z.object({
  province: z.string(),
  ward: z.string(),
  streetAddress: z.string(),
});

const invoiceInfoSchema = z.object({
  companyName: z.string(),
  taxCode: z.string(),
  address: z.string(),
  email: z.string(),
});

export const orderItemSchema = z.object({
  skuId: z.number(),
  skuCode: z.string(),
  bookTitle: z.string(),
  editionName: z.string().nullable(),
  isbn: z.string(),
  coverType: z.string(),
  unitPrice: z.number(),
  quantity: z.number(),
  lineTotal: z.number(),
  /** Giảm giá khuyến mãi đã chia về dòng; đơn cũ không có thì 0. */
  discountAmount: z.number().default(0),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderStatusLogSchema = z.object({
  fromStatus: z.string().nullable(),
  toStatus: z.string(),
  note: z.string().nullable(),
  createdAt: z.string(),
});

/** Hướng dẫn chuyển khoản do backend trả (SePay); `transferContent` là mã đơn, `qrUrl` là ảnh VietQR. */
export const paymentInstructionsSchema = z.object({
  bankName: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  amount: z.number(),
  transferContent: z.string(),
  qrUrl: z.string(),
});
export type PaymentInstructions = z.infer<typeof paymentInstructionsSchema>;

/** `OrderResponse`: trả về khi tạo đơn và khi tra cứu đơn. */
export const orderSchema = z.object({
  orderCode: z.string(),
  status: z.string(),
  paymentMethod: z.string(),
  paymentStatus: z.string(),
  customerName: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  shippingAddress: shippingAddressSchema,
  items: z.array(orderItemSchema),
  subtotal: z.number(),
  discount: z.number(),
  shippingFee: z.number(),
  /** Giảm phí ship từ khuyến mãi; khách thực trả `shippingFee - shippingDiscount`. */
  shippingDiscount: z.number().default(0),
  total: z.number(),
  appliedPromotions: z.array(appliedPromotionSchema).default([]),
  invoiceRequired: z.boolean(),
  invoiceInfo: invoiceInfoSchema.nullable(),
  note: z.string().nullable(),
  paymentExpiresAt: z.string().nullable(),
  canCancel: z.boolean(),
  createdAt: z.string(),
  history: z.array(orderStatusLogSchema),
  /** Chỉ có với đơn chuyển khoản còn chờ thanh toán và khi backend đã cấu hình tài khoản nhận tiền. */
  paymentInstructions: paymentInstructionsSchema.nullable().default(null),
});
export type Order = z.infer<typeof orderSchema>;

/** Một dòng trong danh sách "Đơn của tôi" (`OrderSummaryResponse`); `itemCount` là tổng số cuốn. */
export const orderSummarySchema = z.object({
  orderCode: z.string(),
  status: z.string(),
  paymentMethod: z.string(),
  paymentStatus: z.string(),
  customerName: z.string(),
  phone: z.string(),
  itemCount: z.number(),
  total: z.number(),
  createdAt: z.string(),
});
export type OrderSummary = z.infer<typeof orderSummarySchema>;

export const orderPageSchema = z.object({
  items: z.array(orderSummarySchema),
  meta: z.object({ page: z.number(), limit: z.number(), total: z.number() }),
});
export type OrderPage = z.infer<typeof orderPageSchema>;
