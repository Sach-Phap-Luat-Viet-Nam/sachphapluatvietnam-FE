// Route backend đã chạy nhưng chưa có trong `openapi/v1.json` (chưa sinh lại được vì OpenAPI chỉ bật ở Development).
// Khai báo tạm ở đây với response `unknown`, nơi gọi parse bằng Zod theo docs. Sau khi
// `pnpm api:fetch && pnpm api:generate` có route này thì xóa khai báo tương ứng.

type NoParameters = { query?: never; header?: never; path?: never; cookie?: never };
type JsonBody<T> = { content: { "application/json": T } };
type UnknownJson = { headers: { [name: string]: unknown }; content: { "application/json": unknown } };
type NoContent = { headers: { [name: string]: unknown }; content?: never };
type OtherMethods = { options?: never; head?: never; patch?: never; trace?: never };

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
}

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
}
