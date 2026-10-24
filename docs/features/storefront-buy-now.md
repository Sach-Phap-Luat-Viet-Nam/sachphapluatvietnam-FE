# Mua ngay trên storefront

> **Trạng thái (24/10/2026)**: backend đã code `POST /api/v1/orders/buy-now` nhưng **chưa merge/deploy**. FE chưa
> làm. Trước khi gọi API thật, kiểm tra `/openapi/v1.json` đã có route này; trong lúc chờ thì mock bằng MSW (SKILL.md
> mục 6).

## Mục đích

Nút **"Mua ngay"** ở trang chi tiết sách, cạnh nút "Thêm vào giỏ" (đặc tả: trang chi tiết sách có cả hai nút). Khách
bấm là đi thẳng tới thanh toán **chỉ với cuốn sách đó**, không phải bỏ vào giỏ trước. **Giỏ hàng giữ nguyên**: sách
khách đã bỏ vào giỏ trước đó vẫn còn sau khi đặt đơn Mua ngay.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **storefront**. Phần dưới là luồng đề xuất; tên route, query và component do FE chốt.

1. **Trang chi tiết `/sach/<slug>`**: nút "Mua ngay" dùng cùng lựa chọn loại bìa (SKU) và số lượng (1–20) với "Thêm
   vào giỏ". Hiện/ẩn theo đúng điều kiện "mua được" của nút "Thêm vào giỏ" (ấn bản `on_sale`/`clearance`, SKU
   `inStock = true`).
   - Đang xem **ấn bản cũ**: nên mở dialog xác nhận US-02 như khi thêm vào giỏ, rồi mới chuyển trang.
   - Bấm nút **không gọi API**, chỉ chuyển sang trang thanh toán và mang theo slug, `skuId` và số lượng, ví dụ
     `/thanh-toan?mua-ngay=<slug>&sku=<skuId>&sl=<n>`. Để trên URL thì F5 không mất lựa chọn.
2. **Trang `/thanh-toan` ở chế độ Mua ngay** (có query Mua ngay):
   - **Không** đọc `GET /cart` cho phần tóm tắt. Lấy thông tin sách bằng `GET /books/{slug}`, rồi tìm SKU theo `id`
     trong `editions[].skus[]`. SKU không còn hoặc hết hàng thì báo lỗi kèm link về trang sách.
   - Tóm tắt: 1 dòng (bìa, tên, ấn bản · loại bìa, đơn giá `salePrice`, số lượng), tạm tính = `salePrice × số lượng`,
     phí ship lấy từ `POST /shipping/quote`. Tổng chỉ để xem; số chốt là `subtotal`, `shippingFee`, `total` trong
     response tạo đơn.
   - Form giao hàng, hóa đơn, điền sẵn cho thành viên, sổ địa chỉ: **dùng lại nguyên form hiện tại**.
   - Không cần kiểm tra chặn đặt hàng theo giỏ (`checkoutBlocker`) vì không dùng giỏ.
3. **Bấm "Đặt hàng"**: gọi `POST /orders/buy-now` (body ở mục API). Áp dụng **`Idempotency-Key`** giống hệt đặt từ
   giỏ: sinh một lần khi vào trang, giữ nguyên khi bấm lại; gặp `IDEMPOTENCY_KEY_REUSED` thì sinh key mới và gửi lại
   **một lần**.
4. **Thành công (201)**: hiện màn cảm ơn `OrderPlaced` như hiện tại. **Không làm trống giỏ trong cache**, và cũng
   không cần tải lại giỏ, vì backend không đụng tới giỏ.

## API backend sử dụng (method, route, mã lỗi được xử lý)

| Method | Route                    | Xác thực | Request                                                | Response            |
| ------ | ------------------------ | -------- | ------------------------------------------------------ | ------------------- |
| POST   | `/api/v1/orders/buy-now` | Tùy chọn | `BuyNowOrderRequest` + header `Idempotency-Key` (≤ 64) | 201 `OrderResponse` |
| GET    | `/api/v1/books/{slug}`   | Không    | —                                                      | Chi tiết sách + SKU |
| POST   | `/api/v1/shipping/quote` | Không    | `{ "subtotal": 300000 }`                               | Phí ship dự kiến    |

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
- Khi lỗi sách/tồn, giữ nguyên form để khách không mất thông tin đã nhập; link "Xem lại giỏ hàng" đổi thành "Quay lại
  trang sách".

## Cấu hình cần thiết (biến môi trường)

Không thêm biến môi trường. Sau khi backend deploy, chạy `pnpm api:generate` để có type của route mới. `paymentMethod`
nhiều khả năng vẫn bị sinh thành `number`, nên cần `// @ts-expect-error` giống `POST /orders` trong
`features/ordering/api.ts`.

## Hạn chế / việc còn lại

- Mỗi lần Mua ngay chỉ đặt **một SKU**.
- Chưa có API xem trước đơn: FE tự tính tạm tính từ `GET /books/{slug}` và gọi `/shipping/quote`; giá trên trang có thể
  lệch nếu lịch giá vừa đổi, nên con số chốt luôn là của response tạo đơn.
- Cần bổ sung `POST /api/v1/orders/buy-now` vào `docs/api_reference.md` khi backend deploy.
- Việc FE cần làm:
  - [ ] Nút "Mua ngay" ở trang chi tiết (desktop + thanh cố định dưới màn hình trên mobile), có dialog ấn bản cũ.
  - [ ] Chế độ Mua ngay của `/thanh-toan`: tóm tắt 1 dòng từ `GET /books/{slug}`, không động vào cache giỏ.
  - [ ] Hàm `buyNow` trong `features/ordering/api.ts`, xử lý lỗi theo bảng trên.
  - [ ] Test: component test (MSW) cho luồng thành công, giữ nguyên giỏ, lỗi `OUT_OF_STOCK`/`SKU_NOT_AVAILABLE`,
        thử lại `Idempotency-Key`; Playwright luồng Mua ngay COD.
