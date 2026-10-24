# Chi tiết sách, giỏ hàng, đặt hàng và tra cứu đơn trên storefront

## Mục đích

Luồng mua sách của khách trên storefront (FR-21, FR-22, FR-30–FR-33, FR-36, FR-37, FR-40, US-02, BR-03, BR-14): xem
chi tiết sách, thêm vào giỏ, sửa giỏ, đặt hàng COD (chuyển khoản khi đã cấu hình tài khoản nhận tiền), tra cứu đơn.
Dùng được cho cả khách vãng lai và thành viên. Đặc tả backend ở `docs/features/cart.md`, `docs/features/ordering.md`
và `docs/api_reference.md`; file này chỉ mô tả phần FE.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **storefront**. Code ở `features/catalog` (trang chi tiết) và `features/ordering` (giỏ, đặt hàng, tra cứu).

| Route                    | Render                         | Nội dung                                                     |
| ------------------------ | ------------------------------ | ------------------------------------------------------------ |
| `/sach/<slug>`           | Server, động                   | Chi tiết sách, chọn ấn bản `?an-ban=<id>`, form thêm vào giỏ |
| `/gio-hang`              | Tĩnh, giỏ tải ở trình duyệt    | Sửa số lượng, xóa dòng, tổng dự kiến, nút Đặt hàng           |
| `/thanh-toan`            | Tĩnh, giỏ tải ở trình duyệt    | Form giao hàng + tóm tắt giỏ; đặt xong hiện màn cảm ơn       |
| `/don-hang/tra-cuu?ma=…` | Server, động (điền sẵn `?ma=`) | Tra cứu đơn bằng mã đơn + số điện thoại                      |

Giỏ hàng, thanh toán và tra cứu đặt `noindex`; trang chi tiết sách được index.

### Trang chi tiết `/sach/<slug>`

- `getBook` (`features/catalog/api.ts`) gọi `GET /books/{slug}` trên server, bọc `cache()` để `generateMetadata` và
  trang dùng chung một request. 404 → `not-found.tsx` của route.
- **Ấn bản**: mặc định ấn bản mới nhất; `?an-ban=<id>` chọn ấn bản khác (id lạ thì về mới nhất). Ấn bản cũ hiện thanh
  cảnh báo "Đã có ấn bản mới" kèm link (BR-03). Canonical luôn là `/sach/<slug>`.
- **Mua được** khi ấn bản `on_sale`/`clearance` và có SKU; còn lại hiện "Sắp phát hành, dự kiến …", "Ngừng bán",
  "Chưa có giá bán". SKU `inStock = false` thì nút thành "Tạm hết hàng".
- **Thêm vào giỏ** (`AddToCartForm`, client): chọn loại bìa (nếu có nhiều SKU), số lượng 1–20, `POST /cart/items`.
  Đang xem ấn bản cũ thì mở dialog xác nhận **trước khi** gọi API (US-02): "Xem ấn bản mới" hoặc "Vẫn thêm ấn bản này".
  Thành công hiện "Đã thêm n cuốn vào giỏ" + link giỏ; lỗi hiện thông báo theo `code`.
- **Thông tin xuất bản** (FR-21): ISBN, NXB, số QĐXB, số ĐKXB, năm, ngày phát hành, số trang, khổ, trọng lượng,
  "cập nhật văn bản đến ngày"; danh sách văn bản pháp luật được cập nhật; link "Đọc thử" (chỉ nhận `https://`).
- **Mô tả** là HTML Admin nhập: lọc trên server bằng `sanitize-html` (`features/catalog/description.ts`), chỉ giữ
  `p, br, strong, b, em, i, u, ul, ol, li, h2–h4, blockquote, a[href http/https/mailto]`; `h1` hạ thành `h2`; link mở
  tab mới với `rel="nofollow noopener noreferrer"`. Meta description: `metaDescription`, nếu trống thì 160 ký tự đầu
  của mô tả.
- **SEO**: `generateMetadata` (title, description, canonical, Open Graph `book` + ảnh bìa), JSON-LD
  `Book`+`Product`/`Offer` (mỗi SKU một offer, `InStock`/`OutOfStock`/`Discontinued`) và `BreadcrumbList` (NFR-31),
  `<` được thoát thành `<`.

### Giỏ hàng

- Dữ liệu giỏ phía client dùng **TanStack Query** (`features/ordering/useCart.ts`, `QueryProvider` trong `layout.tsx`).
  Key `["cart", <người dùng>]`: chờ khôi phục phiên xong mới tải; đăng nhập/đăng xuất đổi key nên giỏ tải lại. Lần tải
  đầu sau đăng nhập gửi cả Bearer và cookie `sl_cart`, backend tự gộp giỏ khách vào giỏ tài khoản.
- Mọi API giỏ trả lại cả giỏ → thay cache bằng response. Lỗi khi thêm/sửa thì tải lại giỏ.
- **Header** (`CartLink`): icon giỏ + số cuốn (`totalQuantity`), không hiện số khi chưa tải được giỏ.
- **`/gio-hang`** (`CartView`): mỗi dòng có bìa, tên (link về trang sách), ấn bản · loại bìa, đơn giá, nút −/+ (tối đa
  20), Xóa, thành tiền. Cảnh báo theo dòng: ngừng bán (`isSellable = false`), thiếu hàng (`quantity > availableQuantity`),
  đã có ấn bản mới (`isLatestEdition = false`).
- **Tóm tắt** (`CartSummary`): tạm tính, phí ship từ `POST /shipping/quote`, **tổng dự kiến** (chỉ để xem, không gửi
  lên), "Mua thêm … để được miễn phí vận chuyển". Không lấy được phí ship thì ẩn dòng phí, không chặn đặt hàng.
- Nút "Đặt hàng" chỉ hiện khi giỏ không trống, không có dòng ngừng bán hoặc thiếu hàng (`checkoutBlocker`); ngược lại
  hiện lý do.

### Đặt hàng `/thanh-toan`

- Form React Hook Form + Zod (`features/ordering/order-forms.ts`): họ tên, số điện thoại (`0xxxxxxxxx`/`+84xxxxxxxxx`,
  cho gõ khoảng trắng/dấu chấm), email (không bắt buộc), tỉnh/thành, phường/xã, số nhà, phương thức thanh toán, "Xuất
  hóa đơn công ty" (tên công ty, MST 10 số hoặc `-xxx`, địa chỉ, email), ghi chú. Tên field trùng key lỗi của backend
  (`shippingAddress.ward`, `invoiceInfo.taxCode`) nên lỗi `VALIDATION_ERROR` hiện đúng ô.
- **Idempotency-Key**: `crypto.randomUUID()` sinh một lần mỗi lần vào trang, giữ nguyên khi bấm lại. Nút bị khóa trong
  lúc gửi. Backend trả `IDEMPOTENCY_KEY_REUSED` → sinh key mới và gửi lại **một lần**.
- Lỗi do giỏ đã đổi (`CART_EMPTY`, `SKU_NOT_AVAILABLE`, `MAX_QTY_EXCEEDED`, `OUT_OF_STOCK`): hiện thông báo + link
  "Xem lại giỏ hàng", tải lại giỏ. Giỏ có dòng lỗi thì vẫn giữ form (không mất thông tin đã nhập) nhưng khóa nút.
- **Thành công**: làm trống giỏ trong cache (backend đã xóa giỏ), hiện màn cảm ơn ngay tại trang (`OrderPlaced`): mã đơn,
  nhắc lưu mã + số điện thoại, link tra cứu, chi tiết đơn. Đơn **không** lưu vào storage của trình duyệt vì có dữ liệu cá
  nhân; tải lại trang thì mất màn cảm ơn, khách tra cứu bằng mã đơn.
- **Chuyển khoản**: chỉ hiện khi `BANK_ACCOUNT` trong `features/ordering/payment.ts` khác `null`. Khi đó màn cảm ơn hiện
  ngân hàng, số tài khoản, chủ tài khoản, số tiền, nội dung = mã đơn và đồng hồ đếm ngược tới `paymentExpiresAt`
  (30 phút).

### Tra cứu đơn `/don-hang/tra-cuu`

- Mã đơn (tự viết hoa) + số điện thoại đặt hàng → `POST /orders/lookup`. Hiện trạng thái, thanh toán, ngày đặt, sách,
  tiền, địa chỉ, hóa đơn, dòng thời gian trạng thái (`history`, FR-40).
- `NOT_FOUND` → "Không tìm thấy đơn hàng…"; `TOO_MANY_REQUESTS` (10 lần/phút/IP) → "thao tác quá nhanh".
- Đơn còn hủy được (`canCancel`): hướng dẫn liên hệ CSKH (khách vãng lai chưa tự hủy được qua API).

## API backend sử dụng (method, route, mã lỗi được xử lý)

Trang chi tiết gọi từ server qua `serverApi` (cache 60 giây). Các API còn lại gọi từ trình duyệt qua proxy `/api/v1`
bằng `browserApi()` của `@slvn/auth` (gửi cookie `sl_cart`, gắn Bearer khi đã đăng nhập).

| Method | Route                        | Dùng cho                 | Mã lỗi xử lý riêng                                                   |
| ------ | ---------------------------- | ------------------------ | -------------------------------------------------------------------- |
| GET    | `/api/v1/books/{slug}`       | Trang chi tiết           | 404 → trang không tìm thấy                                           |
| GET    | `/api/v1/cart`               | Header, giỏ, thanh toán  | —                                                                    |
| POST   | `/api/v1/cart/items`         | Thêm vào giỏ (cộng thêm) | `MAX_QTY_EXCEEDED`, `OUT_OF_STOCK`, `SKU_NOT_AVAILABLE`, `CART_FULL` |
| PATCH  | `/api/v1/cart/items/{skuId}` | Đổi số lượng             | như trên                                                             |
| DELETE | `/api/v1/cart/items/{skuId}` | Xóa dòng                 | —                                                                    |
| POST   | `/api/v1/shipping/quote`     | Phí ship dự kiến         | lỗi → ẩn dòng phí                                                    |
| POST   | `/api/v1/orders`             | Đặt hàng                 | `VALIDATION_ERROR` theo field, `IDEMPOTENCY_KEY_REUSED`, lỗi giỏ     |
| POST   | `/api/v1/orders/lookup`      | Tra cứu đơn              | `NOT_FOUND`, `TOO_MANY_REQUESTS`                                     |

- Response parse bằng Zod (`features/catalog/schemas.ts`, `features/ordering/schemas.ts`) vì OpenAPI sinh enum thành
  `number`, số thành `number | string`.
- Body `POST /orders` gửi `paymentMethod` dạng chuỗi (`cod`) có `// @ts-expect-error` trong `features/ordering/api.ts`
  vì type sinh ra là `number`. Khi backend sửa OpenAPI, TypeScript sẽ báo dòng này để gỡ.
- Lỗi 5xx hiện thông báo chung kèm `traceId`; mất mạng hiện "Không kết nối được máy chủ".

## Cấu hình cần thiết (biến môi trường)

Không thêm biến môi trường. Dùng `API_BASE_URL`, `PROXY_SECRET` như các trang khác.

Thêm package `sanitize-html` (+ `@types/sanitize-html`) cho storefront, chỉ dùng trên server.

## Hạn chế / việc còn lại

- **Thông tin tài khoản nhận chuyển khoản chưa có**: `BANK_ACCOUNT = null` nên chỉ có COD. Điền ngân hàng, số tài khoản,
  chủ tài khoản vào `features/ordering/payment.ts` để bật chuyển khoản. `TrustBand` vẫn ghi "hoặc chuyển khoản".
- Backend Render (kiểm tra 24/10/2026): `POST /cart/items`, `DELETE /cart/items/{id}` trả 500 `INTERNAL_ERROR`,
  `/health/ready` trả 503 (Redis/CSDL chưa sẵn sàng); `GET /cart`, `GET /books/{slug}`, `POST /shipping/quote` chạy
  được. Chưa thử được thêm giỏ và đặt hàng end-to-end với backend thật.
- Slug không tồn tại trả HTTP **200** kèm `noindex` (không phải 404), vì `loading.tsx` đã bắt đầu stream trước khi
  `notFound()` chạy (hành vi của Next.js 16). Muốn 404 thật thì kiểm tra slug trong Proxy hoặc bỏ `loading.tsx`.
- JSON-LD dùng URL tương đối vì chưa có domain chính thức (chưa cấu hình `metadataBase`).
- Chưa có trang "Đơn của tôi" cho thành viên (`GET /orders`, `GET /orders/{code}`, `POST /orders/{code}/cancel`), chưa
  có màn quản lý đơn ở Admin.
- Tỉnh/thành, phường/xã là ô nhập tự do (chưa có danh mục địa giới 2 cấp); chưa có sổ địa chỉ, chưa tự điền thông tin
  của thành viên đã đăng nhập.
- Chưa có mã giảm giá (backend chưa có `/cart/apply-coupon`), pre-order, cổng thanh toán online.
- Chưa có số hotline CSKH để hiện ở chỗ "liên hệ CSKH" (báo giá sỉ, hủy đơn).
- Breadcrumb danh mục dùng `/sach?category=<slug>` vì chưa có route `/danh-muc/<slug>` (NFR-30).

## Kiểm tra

Unit test: chọn ấn bản, trạng thái bán, thông tin xuất bản, JSON-LD, lọc mô tả HTML, dòng lỗi giỏ, chặn đặt hàng, phí
ship, thông báo lỗi, đếm ngược, schema form đặt hàng/tra cứu. Component test (MSW): thêm vào giỏ (chọn bìa, xác nhận ấn
bản cũ, lỗi), giỏ hàng (sửa, xóa, cảnh báo), đặt hàng (validate, `Idempotency-Key`, lỗi theo field, hóa đơn, thử lại
key, hết hàng, chuyển khoản), tra cứu đơn.
