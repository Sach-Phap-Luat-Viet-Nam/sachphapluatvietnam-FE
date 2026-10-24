import { z } from "zod";

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
  freeShippingThreshold: z.number(),
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
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderStatusLogSchema = z.object({
  fromStatus: z.string().nullable(),
  toStatus: z.string(),
  note: z.string().nullable(),
  createdAt: z.string(),
});

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
  total: z.number(),
  invoiceRequired: z.boolean(),
  invoiceInfo: invoiceInfoSchema.nullable(),
  note: z.string().nullable(),
  paymentExpiresAt: z.string().nullable(),
  canCancel: z.boolean(),
  createdAt: z.string(),
  history: z.array(orderStatusLogSchema),
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
