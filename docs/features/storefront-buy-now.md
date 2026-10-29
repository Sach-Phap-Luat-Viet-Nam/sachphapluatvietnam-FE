# Mua ngay trên storefront

> **Trạng thái (24/10/2026)**: backend có `POST /api/v1/orders/buy-now` (commit `bf488bc` repo backend). **FE đã làm**
> (xem "Hạn chế / việc còn lại"). Route đã có trong `openapi/v1.json` nhưng OpenAPI mô tả enum `paymentMethod` là
> `integer`, nên vẫn khai báo tay ở `packages/api-client/src/pending-paths.ts`.

## Mục đích

Nút **"Mua ngay"** ở trang chi tiết sách, cạnh nút "Thêm vào giỏ" (đặc tả: trang chi tiết sách có cả hai nút). Khách
bấm là đi thẳng tới thanh toán **chỉ với cuốn sách đó**, không phải bỏ vào giỏ trước. **Giỏ hàng giữ nguyên**: sách
khách đã bỏ vào giỏ trước đó vẫn còn sau khi đặt đơn Mua ngay.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **storefront**. Code: `features/ordering/buy-now.ts` (đọc/tạo link, dựng dòng tóm tắt), `AddToCartForm.tsx` (nút),
`Checkout.tsx` (`BuyNowCheckout`), `api.ts` (`fetchBuyNowBook`, `placeBuyNowOrder`).

1. **Trang chi tiết `/sach/<slug>`**: nút "Mua ngay" (link, cạnh "Thêm vào giỏ") dùng cùng lựa chọn loại bìa (SKU) và
   số lượng (1–20). Chỉ hiện khi khối đặt mua hiện (ấn bản `on_sale`/`clearance`) và SKU đang chọn `inStock = true`.
   - Đang xem **ấn bản cũ**: mở dialog xác nhận US-02 dùng chung với "Thêm vào giỏ"; nút xác nhận đổi thành "Vẫn mua
     ấn bản này" rồi mới chuyển trang.
   - Bấm nút **không gọi API**, chỉ chuyển sang `/thanh-toan?mua-ngay=<slug>&sku=<skuId>&sl=<n>`. Để trên URL thì F5
     không mất lựa chọn. Query thiếu hoặc sai (sửa tay, `sl` ngoài 1–20) thì báo "Liên kết không hợp lệ", không lặng lẽ
     đặt từ giỏ.
   - **Thẻ sách** (trang chủ, `/sach`, hộp Xem nhanh): nút chữ "Mua ngay" cạnh nút giỏ (`QuickBuyButton`, đặt chung với
     `QuickAddButton` trong `QuickPurchase`). Chọn SKU như thêm nhanh (ấn bản mới nhất đang bán, SKU còn hàng rẻ nhất),
     số lượng 1, rồi sang `/thanh-toan?mua-ngay=…`. Không có SKU mua được thì mở trang chi tiết. Không hiện dialog ấn bản
     cũ vì thẻ sách luôn là ấn bản mới nhất.
2. **Trang `/thanh-toan` ở chế độ Mua ngay** (có query Mua ngay; page đọc `searchParams` nên render động):
   - **Không** đọc `GET /cart` cho phần tóm tắt. Lấy thông tin sách bằng `GET /books/{slug}`, rồi tìm SKU theo `id`
     trong `editions[].skus[]`. Sách 404 → "Không tìm thấy sách"; SKU không còn thuộc sách → "Sách không còn bán", kèm
     link về trang sách. SKU hết hàng hoặc ấn bản ngừng bán → vẫn hiện form nhưng khóa nút Đặt hàng và nêu lý do.
   - Tóm tắt: 1 dòng (bìa, tên, ấn bản · loại bìa, số lượng); tạm tính, giảm giá, phí ship, tổng lấy từ
     `POST /checkout/preview` với `source = buy_now`, `skuId`, `quantity` (`storefront-checkout-promotion.md`). Số chốt
     vẫn là `subtotal`, `shippingFee`, `total` trong response tạo đơn.
   - Form giao hàng, hóa đơn, điền sẵn cho thành viên, sổ địa chỉ: **dùng lại nguyên form hiện tại**.
   - Không cần kiểm tra chặn đặt hàng theo giỏ (`checkoutBlocker`) vì không dùng giỏ.
3. **Bấm "Đặt hàng"**: gọi `POST /orders/buy-now` (body ở mục API). Áp dụng **`Idempotency-Key`** giống hệt đặt từ
   giỏ: sinh một lần khi vào trang, giữ nguyên khi bấm lại; gặp `IDEMPOTENCY_KEY_REUSED` thì sinh key mới và gửi lại
   **một lần**.
4. **Thành công (201)**: hiện màn cảm ơn `OrderPlaced` như hiện tại. **Không làm trống giỏ trong cache**, và cũng
   không cần tải lại giỏ, vì backend không đụng tới giỏ.

## API backend sử dụng (method, route, mã lỗi được xử lý)

| Method | Route                      | Xác thực | Request                                                     | Response            |
| ------ | -------------------------- | -------- | ----------------------------------------------------------- | ------------------- |
| POST   | `/api/v1/orders/buy-now`   | Tùy chọn | `BuyNowOrderRequest` + header `Idempotency-Key` (≤ 64)      | 201 `OrderResponse` |
| GET    | `/api/v1/books/{slug}`     | Không    | —                                                           | Chi tiết sách + SKU |
| POST   | `/api/v1/checkout/preview` | Không    | `{ "source": "buy_now", "skuId": 100, "quantity": 2, ... }` | Tổng tiền xem trước |

Gọi từ trình duyệt qua `browserApi()` như `POST /orders`, để đơn của thành viên gắn với tài khoản (Bearer).

### BuyNowOrderRequest

Giống hệt `CreateOrderRequest` trong `docs/api_reference.md`, **thêm hai field**:

| Field      | Kiểu   | Ràng buộc                                                                                 |
| ---------- | ------ | ----------------------------------------------------------------------------------------- |
| `skuId`    | number | bắt buộc, > 0; là `editions[].skus[].id` của `GET /books/{slug}`                          |
| `quantity` | number | bắt buộc, ≥ 1; trên 20 thì backend trả `MAX_QTY_EXCEEDED` (không phải `VALIDATION_ERROR`) |

```json
{
  "skuId": 100,
  "quantity": 2,
  "customerName": "Nguyễn Văn A",
  "phone": "0901234567",
  "email": "a@example.com",
  "shippingAddress": { "province": "Hà Nội", "ward": "Phường Cầu Giấy", "streetAddress": "1 Xuân Thủy" },
  "paymentMethod": "cod",
  "invoiceInfo": null,
  "note": null
}
```

Response là `OrderResponse` như `POST /orders`, `items` có đúng 1 dòng. Trạng thái đầu: COD → `pending_confirm`; chuyển
khoản → `pending_payment` kèm `paymentExpiresAt` (30 phút).

### Lỗi

| HTTP | `code`                         | Khi nào / FE xử lý                                                                                  |
| ---- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`             | Lỗi theo field như `POST /orders`; có thể thêm key `skuId`, `quantity`                              |
| 422  | `SKU_NOT_AVAILABLE`            | Sách vừa ngừng bán hoặc SKU không tồn tại; `title` = "Sách này hiện không bán" → link về trang sách |
| 422  | `MAX_QTY_EXCEEDED`             | Số lượng > 20 → gợi ý báo giá sỉ                                                                    |
| 409  | `OUT_OF_STOCK`                 | Không đủ tồn lúc đặt, chưa tạo đơn → link về trang sách để chọn lại số lượng                        |
| 422  | `PAYMENT_METHOD_NOT_SUPPORTED` | Phương thức ngoài COD/chuyển khoản                                                                  |
| 409  | `IDEMPOTENCY_KEY_REUSED`       | Sinh key mới rồi gửi lại một lần                                                                    |

- **Không có `CART_EMPTY`**, vì route này không đọc giỏ.
- Khi lỗi sách/tồn (`SKU_NOT_AVAILABLE`, `MAX_QTY_EXCEEDED`, `OUT_OF_STOCK`): giữ nguyên form để khách không mất thông
  tin đã nhập, tải lại sách (hết hàng thì khóa nút), link "Xem lại giỏ hàng" đổi thành "Quay lại trang sách". Câu chữ
  của `SKU_NOT_AVAILABLE`/`OUT_OF_STOCK` không nhắc tới giỏ (`BUY_NOW_MESSAGES` trong `Checkout.tsx`).

## Cấu hình cần thiết (biến môi trường)

Không thêm biến môi trường. `openapi/v1.json` đã có route này nhưng `paymentMethod` sinh thành `number`; khi backend sửa
OpenAPI (enum dạng chuỗi) thì xóa khai báo `/api/v1/orders/buy-now` trong `pending-paths.ts`.

## Hạn chế / việc còn lại

- Mỗi lần Mua ngay chỉ đặt **một SKU**.
- Tổng tiền xem trước lấy từ `POST /checkout/preview` (`source = buy_now`); giá có thể đổi giữa lúc xem và lúc đặt, nên
  khi đặt gửi `expectedTotal` và con số chốt luôn là của response tạo đơn.
- `POST /api/v1/orders/buy-now` đã có trong `docs/api_reference.md`.
- Bảng lỗi trên chưa gồm lỗi chung của thanh toán (`CHECKOUT_TOTAL_CHANGED`, `COUPON_*`, `PROMOTION_UNAVAILABLE`,
  `ADDRESS_NOT_SUPPORTED`: xem `storefront-checkout-promotion.md`) và lỗi chống bom hàng COD (`TOO_MANY_OPEN_ORDERS`,
  `COD_NOT_ALLOWED`, 422; FE chưa xử lý riêng).
- Việc FE:
  - [x] Nút "Mua ngay" ở trang chi tiết, có dialog ấn bản cũ.
  - [ ] Thanh cố định dưới màn hình trên mobile (chưa làm; trên mobile nút nằm ngay dưới tên sách nên vẫn thấy sớm).
  - [x] Chế độ Mua ngay của `/thanh-toan`: tóm tắt 1 dòng từ `GET /books/{slug}`, không động vào cache giỏ.
  - [x] `placeBuyNowOrder` / `fetchBuyNowBook` trong `features/ordering/api.ts`, xử lý lỗi theo bảng trên.
  - [x] Component test (MSW): luồng thành công không đọc/xóa giỏ, `OUT_OF_STOCK` giữ form và khóa nút, link sai, SKU
        không còn; test link và dialog ở `AddToCartForm`; test hàm thuần ở `buy-now.test.ts`.
  - [ ] Playwright luồng Mua ngay COD (chưa làm).
