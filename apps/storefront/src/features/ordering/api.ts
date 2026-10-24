import { unwrap } from "@slvn/api-client";
import { browserApi } from "@slvn/auth";
import { cartSchema, orderPageSchema, orderSchema, shippingQuoteSchema } from "./schemas";
import type { Cart, Order, OrderPage, ShippingQuote } from "./schemas";
import type { CreateOrderBody } from "./order-forms";
import { quickAddBookSchema } from "./quick-add";
import type { QuickAddBook } from "./quick-add";

// Gọi từ trình duyệt qua proxy `/api/v1` để gửi kèm cookie giỏ khách `sl_cart`. `browserApi` gắn Bearer khi đã
// đăng nhập: giỏ theo tài khoản, đơn gắn với tài khoản, và backend tự gộp giỏ khách vào giỏ tài khoản.

export async function fetchCart(): Promise<Cart> {
  return cartSchema.parse(await unwrap(browserApi().GET("/api/v1/cart")));
}

/** Cộng thêm `quantity` cuốn vào số đang có trong giỏ. */
export async function addCartItem(skuId: number, quantity: number): Promise<Cart> {
  return cartSchema.parse(await unwrap(browserApi().POST("/api/v1/cart/items", { body: { skuId, quantity } })));
}

/** Đặt số lượng của một dòng; `0` là xóa dòng. */
export async function setCartItemQuantity(skuId: number, quantity: number): Promise<Cart> {
  const data = await unwrap(
    browserApi().PATCH("/api/v1/cart/items/{skuId}", { params: { path: { skuId } }, body: { quantity } }),
  );
  return cartSchema.parse(data);
}

export async function removeCartItem(skuId: number): Promise<Cart> {
  const data = await unwrap(browserApi().DELETE("/api/v1/cart/items/{skuId}", { params: { path: { skuId } } }));
  return cartSchema.parse(data);
}

/** Ấn bản và SKU của một sách (API công khai), dùng cho nút thêm nhanh trên thẻ sách. */
export async function fetchQuickAddBook(slug: string): Promise<QuickAddBook> {
  const data = await unwrap(browserApi().GET("/api/v1/books/{slug}", { params: { path: { slug } } }));
  return quickAddBookSchema.parse(data);
}

/** Phí ship dự kiến theo tạm tính; con số chốt là `shippingFee` của đơn vừa tạo. */
export async function quoteShipping(subtotal: number): Promise<ShippingQuote> {
  return shippingQuoteSchema.parse(await unwrap(browserApi().POST("/api/v1/shipping/quote", { body: { subtotal } })));
}

/**
 * Tạo đơn từ giỏ hiện tại. Gửi lại cùng `idempotencyKey` (retry, bấm nhiều lần) thì backend trả đúng đơn đã tạo.
 * Thành công thì backend đã xóa giỏ.
 */
export async function placeOrder(order: CreateOrderBody, idempotencyKey: string): Promise<Order> {
  const data = await unwrap(
    browserApi().POST("/api/v1/orders", {
      headers: { "Idempotency-Key": idempotencyKey },
      body: {
        customerName: order.customerName,
        phone: order.phone,
        email: order.email,
        shippingAddress: order.shippingAddress,
        // @ts-expect-error OpenAPI sinh enum `PaymentMethod` thành number; backend nhận chuỗi snake_case (`cod`).
        paymentMethod: order.paymentMethod,
        invoiceInfo: order.invoiceInfo,
        note: order.note,
      },
    }),
  );
  return orderSchema.parse(data);
}

/** Số đơn mỗi trang ở "Đơn của tôi". */
export const MY_ORDERS_PAGE_SIZE = 10;

/** Đơn của thành viên đang đăng nhập, mới nhất trước. */
export async function fetchMyOrders(page: number): Promise<OrderPage> {
  const data = await unwrap(
    browserApi().GET("/api/v1/orders", { params: { query: { Page: page, Limit: MY_ORDERS_PAGE_SIZE } } }),
  );
  return orderPageSchema.parse(data);
}

/** Chi tiết một đơn của mình; đơn của người khác backend trả 404. */
export async function fetchMyOrder(code: string): Promise<Order> {
  return orderSchema.parse(await unwrap(browserApi().GET("/api/v1/orders/{code}", { params: { path: { code } } })));
}

/** Khách tự hủy đơn khi `canCancel` (BR-12: trước khi đóng gói). */
export async function cancelOrder(code: string, reason: string | null): Promise<Order> {
  const data = await unwrap(
    browserApi().POST("/api/v1/orders/{code}/cancel", { params: { path: { code } }, body: { reason } }),
  );
  return orderSchema.parse(data);
}

/** Tra cứu đơn bằng mã đơn + số điện thoại đặt hàng (khách vãng lai), giới hạn 10 request/phút/IP. */
export async function lookupOrder(orderCode: string, phone: string): Promise<Order> {
  return orderSchema.parse(await unwrap(browserApi().POST("/api/v1/orders/lookup", { body: { orderCode, phone } })));
}
