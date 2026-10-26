// Khai báo tay các route mà type sinh từ `openapi/v1.json` chưa dùng được: route chưa có trong OpenAPI, hoặc đã có
// nhưng enum sinh thành `number` (backend nhận chuỗi snake_case) và field tùy chọn thành bắt buộc. Khai báo ở đây
// ghi đè bản sinh ra (xem `ClientPaths` trong `client.ts`); response để `unknown`, nơi gọi parse bằng Zod theo docs.
// Xóa khai báo tương ứng khi OpenAPI của backend sinh đúng kiểu.

type NoParameters = { query?: never; header?: never; path?: never; cookie?: never };
type JsonBody<T> = { content: { "application/json": T } };
type UnknownJson = { headers: { [name: string]: unknown }; content: { "application/json": unknown } };
type NoContent = { headers: { [name: string]: unknown }; content?: never };
type OtherMethods = { options?: never; head?: never; patch?: never; trace?: never };

/** `CheckoutPreviewRequest` (docs/features/checkout-promotion-shipping.md, mục 3.1). */
export interface CheckoutPreviewBody {
  source: "cart" | "buy_now";
  skuId?: number;
  quantity?: number;
  province?: string;
  couponCode?: string;
  phone?: string;
}

/** `BuyNowOrderRequest` (docs/features/storefront-buy-now.md); `paymentMethod` là chuỗi snake_case như backend nhận. */
export interface BuyNowOrderBody {
  skuId: number;
  quantity: number;
  customerName: string;
  phone: string;
  email: string | null;
  shippingAddress: { province: string; ward: string; streetAddress: string };
  paymentMethod: string;
  invoiceInfo: { companyName: string; taxCode: string; address: string; email: string } | null;
  note: string | null;
  couponCode?: string;
  expectedTotal?: number;
}

type Json = Record<string, unknown>;
type Created = { 201: UnknownJson };
type Ok = { 200: UnknownJson };
type Query = { page?: number; limit?: number; q?: string };
type IdParams = Omit<NoParameters, "path"> & { path: { id: number } };

/** Route `/admin/...` mới (khuyến mãi, vận chuyển) của docs/features/checkout-promotion-shipping.md, body để `Json`: Zod/form kiểm tra. */
type Collection<Body extends Json = Json> = {
  parameters: NoParameters;
  get: { parameters: Omit<NoParameters, "query"> & { query?: Query }; requestBody?: never; responses: Ok };
  put?: never;
  post: { parameters: NoParameters; requestBody: JsonBody<Body>; responses: Created };
  delete?: never;
} & OtherMethods;

type Item<Body extends Json = Json> = {
  parameters: NoParameters;
  get: { parameters: IdParams; requestBody?: never; responses: Ok };
  put: { parameters: IdParams; requestBody: JsonBody<Body>; responses: Ok };
  post?: never;
  delete: { parameters: IdParams; requestBody?: never; responses: { 204: NoContent } };
} & OtherMethods;

/** Route chờ sinh type từ OpenAPI, gộp vào `paths` của client. */
export interface PendingPaths {
  /** "Mua ngay" một SKU, giỏ giữ nguyên: 201 `OrderResponse`. */
  "/api/v1/orders/buy-now": {
    parameters: NoParameters;
    get?: never;
    put?: never;
    post: {
      parameters: Omit<NoParameters, "header"> & { header?: { "Idempotency-Key"?: string } };
      requestBody: JsonBody<BuyNowOrderBody>;
      responses: { 201: UnknownJson };
    };
    delete?: never;
  } & OtherMethods;
  /** Chữ ký upload avatar thẳng lên Cloudinary (docs/features/user-avatar.md): 200 `ReplaceUploadSignatureResponse`. */
  "/api/v1/me/avatar/upload-signature": {
    parameters: NoParameters;
    get?: never;
    put?: never;
    post: { parameters: NoParameters; requestBody?: never; responses: { 200: UnknownJson } };
    delete?: never;
  } & OtherMethods;
  /** Lưu `secure_url` vừa upload (200 `{ avatarUrl }`) hoặc bỏ avatar (204). */
  "/api/v1/me/avatar": {
    parameters: NoParameters;
    get?: never;
    put: {
      parameters: NoParameters;
      requestBody: JsonBody<{ avatarUrl: string }>;
      responses: { 200: UnknownJson };
    };
    post?: never;
    delete: { parameters: NoParameters; requestBody?: never; responses: { 204: NoContent } };
  } & OtherMethods;
  /** Xem trước tiền thanh toán: BE là nơi duy nhất tính tiền (giảm giá, phí ship). */
  "/api/v1/checkout/preview": {
    parameters: NoParameters;
    get?: never;
    put?: never;
    post: { parameters: NoParameters; requestBody: JsonBody<CheckoutPreviewBody>; responses: Ok };
    delete?: never;
  } & OtherMethods;
  /** Khuyến mãi đang chạy, công khai, không chứa mã giảm giá. */
  "/api/v1/promotions/active": {
    parameters: NoParameters;
    get: { parameters: NoParameters; requestBody?: never; responses: Ok };
    put?: never;
    post?: never;
    delete?: never;
  } & OtherMethods;
  /** Combo bộ sách đang chạy (docs/features/storefront-combo.md); `skuId` chỉ lấy combo có chứa SKU đó. */
  "/api/v1/combos": {
    parameters: NoParameters;
    get: {
      parameters: Omit<NoParameters, "query"> & { query?: { skuId?: number } };
      requestBody?: never;
      responses: Ok;
    };
    put?: never;
    post?: never;
    delete?: never;
  } & OtherMethods;
  /** Chi tiết một combo đang chạy theo slug: 200 `ComboResponse`, 404 khi không chạy hoặc không tồn tại. */
  "/api/v1/combos/{slug}": {
    parameters: NoParameters;
    get: {
      parameters: Omit<NoParameters, "path"> & { path: { slug: string } };
      requestBody?: never;
      responses: Ok;
    };
    put?: never;
    post?: never;
    delete?: never;
  } & OtherMethods;
  "/api/v1/admin/promotions": Collection;
  "/api/v1/admin/promotions/{id}": Item;
  "/api/v1/admin/promotions/{id}/stats": {
    parameters: NoParameters;
    get: { parameters: IdParams; requestBody?: never; responses: Ok };
    put?: never;
    post?: never;
    delete?: never;
  } & OtherMethods;
  "/api/v1/admin/promotions/{id}/coupons": {
    parameters: NoParameters;
    get: { parameters: IdParams; requestBody?: never; responses: Ok };
    put?: never;
    post: { parameters: IdParams; requestBody: JsonBody<Json>; responses: Created };
    delete?: never;
  } & OtherMethods;
  "/api/v1/admin/promotions/{id}/coupons/generate": {
    parameters: NoParameters;
    get?: never;
    put?: never;
    post: { parameters: IdParams; requestBody: JsonBody<Json>; responses: Ok };
    delete?: never;
  } & OtherMethods;
  "/api/v1/admin/coupons/{id}": {
    parameters: NoParameters;
    get?: never;
    put: { parameters: IdParams; requestBody: JsonBody<Json>; responses: Ok };
    post?: never;
    delete?: never;
  } & OtherMethods;
  "/api/v1/admin/shipping/zones": Collection;
  "/api/v1/admin/shipping/zones/{id}": Omit<Item, "get"> & { get?: never };
  "/api/v1/admin/shipping/settings": {
    parameters: NoParameters;
    get: { parameters: NoParameters; requestBody?: never; responses: Ok };
    put: { parameters: NoParameters; requestBody: JsonBody<Json>; responses: Ok };
    post?: never;
    delete?: never;
  } & OtherMethods;
}
