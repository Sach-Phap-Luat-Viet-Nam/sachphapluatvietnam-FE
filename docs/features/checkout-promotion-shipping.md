# Hướng dẫn FE: thanh toán, khuyến mãi, phí vận chuyển

Dành cho FE Storefront (Next.js) và Admin. Mô tả chi tiết phía BE nằm ở `docs/features/ordering.md`,
`promotion.md`, `shipping.md`; file này chỉ nói **FE cần gọi gì, hiển thị gì, xử lý lỗi nào**.

## 1. Quy ước chung

- Base URL `/api/v1`. JSON **camelCase**; enum **snake_case** (`order_discount`, `buy_now`, `fixed_amount`).
- Tiền là **số nguyên VNĐ** (JSON number). Không tự cộng/trừ/làm tròn ở FE, luôn lấy số từ BE.
- Lỗi là `ProblemDetails`: `{ status, title, code, traceId }`. `title` là thông báo tiếng Việt hiển thị được;
  **xử lý theo `code`**, không theo `title`. Lỗi validate (400, `VALIDATION_ERROR`) có thêm `errors: { fieldCamelCase: string[] }`.
- Khách vãng lai dùng cookie `sl_cart`: mọi request cart/checkout/orders gọi với `credentials: "include"`.
  Đã đăng nhập thì gửi `Authorization: Bearer <accessToken>`.

```ts
type Money = number; // VNĐ nguyên
type ApiError = { status: number; title: string; code: string; traceId: string; errors?: Record<string, string[]> };
```

## 2. Nguyên tắc quan trọng

1. **BE là nơi duy nhất tính tiền.** Trang thanh toán luôn gọi `POST /checkout/preview` và hiển thị đúng các số trả về.
2. **Mã giảm giá không lưu trong giỏ.** FE tự giữ mã (state/sessionStorage) và gửi kèm mỗi lần preview và khi đặt hàng.
3. Khi đặt hàng gửi `expectedTotal = preview.total`. Nếu BE tính lại ra số khác (hết khuyến mãi, hết lượt mã, đổi giá,
   đổi tỉnh) sẽ trả **409 `CHECKOUT_TOTAL_CHANGED`**: gọi lại preview, hiện số mới, để khách bấm xác nhận lần nữa.
4. Gọi preview mỗi khi đổi: giỏ, tỉnh/thành, mã giảm giá, số điện thoại. **Debounce ≥ 400 ms**; giới hạn 60 request/phút/IP,
   vượt thì 429 `TOO_MANY_REQUESTS`.
5. Luôn gửi header `Idempotency-Key` (UUID tạo một lần cho mỗi lần mở trang thanh toán) khi tạo đơn.

## 3. Trang thanh toán

### 3.1. Xem trước: `POST /checkout/preview`

Quyền: tùy chọn đăng nhập.

```ts
type CheckoutPreviewRequest = {
  source: "cart" | "buy_now";
  skuId?: number; // bắt buộc khi buy_now
  quantity?: number; // bắt buộc khi buy_now
  province?: string; // bỏ trống thì tính phí ship cố định
  couponCode?: string; // không phân biệt hoa thường, tối đa 40 ký tự
  phone?: string; // tùy chọn; để BE kiểm tra "mỗi khách dùng tối đa N lần" với khách chưa đăng nhập
};

type CheckoutPreview = {
  items: {
    skuId: number;
    skuCode: string;
    bookTitle: string;
    editionName: string | null;
    coverType: string;
    unitPrice: Money;
    quantity: number;
    lineTotal: Money;
    discountAmount: Money; // giảm đã chia về dòng
  }[];
  subtotal: Money; // tạm tính, trước giảm giá
  discount: Money; // giảm trên tổng đơn
  shippingFee: Money; // phí ship theo biểu giá, đã trừ miễn phí theo ngưỡng, CHƯA trừ shippingDiscount
  shippingDiscount: Money; // giảm phí ship từ khuyến mãi
  total: Money; // = subtotal - discount + shippingFee - shippingDiscount
  appliedPromotions: {
    promotionId: number;
    name: string;
    kind: "order_discount" | "free_shipping";
    couponCode: string | null;
    amount: Money;
  }[];
  couponApplied: boolean | null; // null: khách không nhập mã
  freeShippingThreshold: Money | null; // null: shop không có miễn ship theo ngưỡng
  amountToFreeShipping: Money; // còn thiếu bao nhiêu để được miễn ship, 0 nếu đã đủ hoặc không có ngưỡng
  eta: { minDays: number; maxDays: number } | null;
  zoneName: string | null;
};
```

Gợi ý hiển thị:

| Vị trí                                            | Hiển thị                                                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Dòng sách                                         | `unitPrice × quantity`; nếu `discountAmount > 0` hiện thêm "−{discountAmount}"                      |
| Tóm tắt đơn                                       | Tạm tính, "Giảm giá" (`discount`), "Phí vận chuyển", "Giảm phí ship" (`shippingDiscount`), **Tổng** |
| Phí ship khi `shippingFee − shippingDiscount = 0` | "Miễn phí"                                                                                          |
| Gợi ý freeship                                    | Khi `amountToFreeShipping > 0`: "Mua thêm {amountToFreeShipping} để được miễn phí vận chuyển"       |
| Thời gian giao                                    | Khi `eta != null`: "Dự kiến giao {minDays}–{maxDays} ngày"                                          |
| Ưu đãi đã áp                                      | Liệt kê `appliedPromotions[].name` kèm số tiền                                                      |

`couponApplied === false` nghĩa là mã **hợp lệ nhưng đang có ưu đãi khác lợi hơn** nên mã không được dùng và không bị
trừ lượt: hiện thông báo kiểu "Đã áp ưu đãi tốt nhất cho đơn của bạn".

### 3.2. Nhập mã giảm giá

Gọi preview với `couponCode`. Thành công thì giữ mã; lỗi thì **không** giữ mã và hiện `title` dưới ô nhập. Xem bảng lỗi ở mục 6.

### 3.3. Đặt hàng: `POST /orders` hoặc `POST /orders/buy-now`

Các field cũ giữ nguyên, thêm hai field tùy chọn:

```ts
{ ...nhưCũ, couponCode?: string, expectedTotal?: Money }
// Header: Idempotency-Key: <uuid>
```

Thành công 201 `OrderResponse`, field mới:

```ts
type OrderResponse = {
  // ...field cũ
  items: { /* ...cũ */ discountAmount: Money }[];
  subtotal: Money;
  discount: Money;
  shippingFee: Money;
  shippingDiscount: Money; // khách thực trả phí ship = shippingFee - shippingDiscount
  total: Money;
  appliedPromotions: { promotionId: number; name: string; kind: string; couponCode: string | null; amount: Money }[];
};
```

Luồng xử lý lỗi khi đặt hàng:

- `CHECKOUT_TOTAL_CHANGED` (409): gọi lại preview → hiện số mới → khách xác nhận → đặt lại **với `Idempotency-Key` mới**
  (key cũ chỉ dùng để chống bấm đúp, lần này đơn chưa được tạo nên dùng lại cũng được; nhưng tạo key mới cho chắc).
- `COUPON_EXPIRED` / `PROMOTION_UNAVAILABLE` (422): hết lượt/hết hạn đúng lúc đặt. Preview lại và báo khách.
- Hiển thị tổng ở trang kết quả từ `OrderResponse`, không dùng lại số preview.

## 4. Báo giá nhanh ở trang chi tiết sách: `POST /shipping/quote`

Quyền: không cần đăng nhập.

```ts
// Request: chỉ subtotal vẫn hợp lệ (phí cố định, như bản cũ)
{ subtotal: Money, province?: string, items?: { skuId: number; quantity: number }[] }

// Response
{ shippingFee: Money; freeShippingThreshold: Money | null; amountToFreeShipping: Money;
  eta: { minDays: number; maxDays: number } | null; zoneName: string | null }
```

Dùng cho khối "Phí ship dự kiến" trước khi khách có giỏ. Ở bước thanh toán dùng `preview` thay vì endpoint này.
Tỉnh nằm ngoài vùng giao hàng → 422 `ADDRESS_NOT_SUPPORTED`: hiện "Chưa hỗ trợ giao đến địa chỉ này" và chặn nút đặt hàng.

**Tên tỉnh/thành**: BE so khớp không phân biệt hoa thường, dấu và tiền tố "Thành phố/Tỉnh/TP." nên "Hà Nội",
"TP. Hà Nội" đều khớp. Nên cho khách **chọn từ danh sách tỉnh chuẩn** để tránh sai chính tả.

## 5. Trang khuyến mãi `/khuyen-mai`: `GET /promotions/active`

Quyền: không cần đăng nhập. Trả mảng (tối đa 20, có thể rỗng), **không chứa mã giảm giá**.

```ts
type PublicPromotion = {
  id: number;
  title: string;
  description: string | null;
  kind: "order_discount" | "free_shipping";
  mode: "automatic" | "coupon"; // coupon: khách phải nhập mã (hiện hướng dẫn "nhập mã ở bước thanh toán")
  discountType: "percent" | "fixed_amount";
  discountValue: number; // % hoặc VNĐ tùy discountType
  maxDiscountAmount: Money | null; // trần khi giảm theo %
  minOrderAmount: Money; // 0: không yêu cầu
  scopeType: "all" | "books" | "skus" | "categories";
  excludeOnSaleItems: boolean; // true: không áp cho sách đang giảm giá sẵn
  audience: "everyone" | "members_only"; // members_only: cần đăng nhập
  startsAt: string;
  endsAt: string | null; // ISO UTC; endsAt null = chưa có hạn
};
```

Tạo nhãn: `percent` → "Giảm {discountValue}%" (+ "tối đa {maxDiscountAmount}"); `fixed_amount` → "Giảm {discountValue}đ";
`free_shipping` + `percent 100` → "Miễn phí vận chuyển". `endsAt` là mốc **loại trừ** đã quy đổi UTC: ưu đãi "đến hết 31/12/2026"
có `endsAt` = 0h ngày 01/01/2027 giờ Việt Nam; hiển thị hạn bằng cách lấy ngày của `endsAt` trừ 1 giây (theo giờ VN).
Nội dung quảng cáo dài (như "Giao hàng nhanh toàn quốc…") nằm trong `description`.

## 6. Bảng mã lỗi

| `code`                                                                   | HTTP                  | FE xử lý                                                                        |
| ------------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------- |
| `COUPON_INVALID`                                                         | 422                   | Mã không tồn tại, đã tắt hoặc chưa tới ngày bắt đầu: "Mã giảm giá không hợp lệ" |
| `COUPON_EXPIRED`                                                         | 422                   | Mã hết hạn/hết lượt hoặc khách đã dùng hết lượt của mã. Hiện `title`            |
| `COUPON_MIN_ORDER`                                                       | 422                   | Chưa đạt giá trị tối thiểu; `title` đã ghi số tiền cần đạt                      |
| `COUPON_NOT_APPLICABLE`                                                  | 422                   | Mã không áp cho sách nào trong giỏ                                              |
| `COUPON_LOGIN_REQUIRED`                                                  | 422                   | Mở màn hình đăng nhập, sau đó tự gọi lại preview                                |
| `PROMOTION_UNAVAILABLE`                                                  | 422                   | Khi đặt hàng: ưu đãi vừa hết, preview lại                                       |
| `CHECKOUT_TOTAL_CHANGED`                                                 | 409                   | Mục 3.3                                                                         |
| `ADDRESS_NOT_SUPPORTED`                                                  | 422                   | Chưa hỗ trợ giao đến tỉnh này                                                   |
| `CART_EMPTY` / `SKU_NOT_AVAILABLE` / `MAX_QTY_EXCEEDED` / `OUT_OF_STOCK` | 422 / 422 / 422 / 409 | Như cũ                                                                          |
| `IDEMPOTENCY_KEY_REUSED`                                                 | 409                   | Key đã dùng cho đơn khác; tạo key mới                                           |
| `TOO_MANY_REQUESTS`                                                      | 429                   | Giảm tần suất gọi preview                                                       |
| `VALIDATION_ERROR`                                                       | 400                   | Gắn `errors[field]` vào form                                                    |

## 7. Admin

Quyền: cần đăng nhập nhân viên **đã bật 2FA**, thiếu thì 403 `FORBIDDEN`. Khuyến mãi dùng nhóm quyền
`super_admin`, `product_manager`, `marketing`; vận chuyển dùng `super_admin`, `order_manager`.

### 7.1. Khuyến mãi (`/admin/promotions`)

| Method             | Route                                     | Ghi chú                                                                                         |
| ------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| GET                | `/admin/promotions?q=&page=&limit=`       | Danh sách phân trang `{ items, meta: { page, limit, total } }`                                  |
| GET / PUT / DELETE | `/admin/promotions/{id}`                  | PUT cùng body với POST; DELETE là xóa mềm                                                       |
| POST               | `/admin/promotions`                       | Tạo, 201                                                                                        |
| GET                | `/admin/promotions/{id}/stats`            | `usedCount, releasedCount, totalOrderDiscount, totalShippingDiscount, uniqueCustomers`          |
| GET / POST         | `/admin/promotions/{id}/coupons`          | Danh sách / thêm mã `{ code, usageLimit? }`                                                     |
| POST               | `/admin/promotions/{id}/coupons/generate` | Sinh hàng loạt `{ count, prefix?, usageLimit? }` (`usageLimit` trống = dùng 1 lần), trả mảng mã |
| PUT                | `/admin/coupons/{id}`                     | `{ isActive, usageLimit? }`                                                                     |

Body tạo/sửa:

```ts
type UpsertPromotion = {
  name: string; // tên nội bộ, ≤ 255
  title: string; // hiển thị cho khách, ≤ 255
  description?: string; // ≤ 1000
  kind: "order_discount" | "free_shipping";
  mode: "automatic" | "coupon";
  discountType: "percent" | "fixed_amount";
  discountValue: number; // percent: 1–100 (giảm trên đơn tối đa theo cấu hình, mặc định 50); fixed: VNĐ nguyên > 0
  maxDiscountAmount?: Money | null; // chỉ cho percent
  minOrderAmount: Money; // 0 = không yêu cầu
  scopeType: "all" | "books" | "skus" | "categories";
  targetIds?: number[]; // bắt buộc (1–500 id) nếu scopeType ≠ all; để trống nếu = all
  excludeOnSaleItems: boolean;
  audience: "everyone" | "members_only";
  usageLimit?: number | null; // tổng lượt
  perCustomerLimit?: number | null;
  startsAt: string; // ISO có offset, ví dụ "2026-11-01T00:00:00+07:00"
  endsAt?: string | null; // phải sau startsAt; "đến hết 31/12/2026" = "2027-01-01T00:00:00+07:00"
  isActive: boolean;
  priority: number; // 0–1000
  isPublic: boolean; // false: không hiện ở /khuyen-mai (mã riêng gửi từng khách)
};
```

Ràng buộc form: `free_shipping` chỉ cho `scopeType = all` và `excludeOnSaleItems = false`; thêm mã (`/coupons`) chỉ cho
chương trình `mode = coupon` (không thì 422 `PROMOTION_NOT_COUPON`); mã trùng → 409 `COUPON_CODE_DUPLICATE`.
Mã: 4–40 ký tự `A–Z 0–9 _ -`, hệ thống tự viết hoa.

Response admin thêm: `id, status, usedCount, couponCount, targetIds, createdAt, updatedAt`.
`status`: `inactive | scheduled | running | ended | exhausted` (tính theo giờ hiện tại, dùng làm badge).

Quy tắc chọn ưu đãi để Admin hiểu kết quả: mỗi đơn tối đa **một** chương trình giảm trên đơn và **một** chương trình
giảm phí ship, lấy cái giảm nhiều nhất; không cộng dồn. Nên có dòng chú thích này trên form.

### 7.2. Vận chuyển (`/admin/shipping`)

| Method       | Route                        | Ghi chú                                |
| ------------ | ---------------------------- | -------------------------------------- |
| GET / POST   | `/admin/shipping/zones`      | Danh sách vùng / tạo vùng              |
| PUT / DELETE | `/admin/shipping/zones/{id}` | Sửa / xóa vùng (xóa cả danh sách tỉnh) |
| GET / PUT    | `/admin/shipping/settings`   | Cấu hình chung                         |

```ts
type UpsertZone = {
  name: string;
  isActive: boolean;
  sortOrder: number;
  provinces: string[]; // 1–63 tên tỉnh; mỗi tỉnh chỉ thuộc một vùng
  baseWeightGram: number;
  baseFee: Money; // phí cho X gram đầu
  stepWeightGram: number;
  stepFee: Money; // mỗi bước gram tiếp theo (làm tròn lên) cộng stepFee
  etaMinDays: number;
  etaMaxDays: number; // max ≥ min, ≤ 60
};

type ShippingSettings = {
  freeShippingThreshold: Money | null; // null = tắt miễn ship theo ngưỡng
  packagingWeightGram: number; // cộng vào mỗi đơn
  defaultBookWeightGram: number; // dùng khi ấn bản chưa nhập trọng lượng
  flatFee: Money; // dùng khi chưa chọn tỉnh hoặc chưa có vùng nào
  isDefault?: boolean; // chỉ ở response: true = chưa ai lưu, đang dùng mặc định
};
```

Lỗi: tỉnh đã thuộc vùng khác → 409 `SHIPPING_PROVINCE_DUPLICATE` (highlight tỉnh trùng).
Ví dụ biểu phí: `baseWeightGram 1000, baseFee 20000, stepWeightGram 500, stepFee 5000` → đơn 1.900 g trả 30.000đ.
Nên có ô "tính thử": nhập trọng lượng → hiển thị phí (tính ở FE chỉ để minh họa; số thật luôn do BE trả).

**Lưu ý vận hành**: ngay khi tạo vùng đầu tiên, tỉnh nào chưa nằm trong vùng nào sẽ bị `ADDRESS_NOT_SUPPORTED`.
Admin nên tạo đủ các vùng phủ toàn quốc rồi mới bật. Cảnh báo điều này trên giao diện khi bật vùng đầu tiên.

## 8. Việc cần FE làm khi nâng cấp

- Trang thanh toán và "Mua ngay": chuyển sang `POST /checkout/preview` thay vì tự tính; gửi thêm `expectedTotal`, `couponCode`.
- Đọc `shippingFee − shippingDiscount` làm phí ship thực trả; hiển thị `discount`, `appliedPromotions`.
- `freeShippingThreshold` của `/shipping/quote` có thể là `null`; xử lý trường hợp này.
- Thêm trang `/khuyen-mai` và màn hình Admin khuyến mãi, vận chuyển.
