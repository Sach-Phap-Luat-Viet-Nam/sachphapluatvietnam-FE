# Chi tiết sách, giỏ hàng, đặt hàng và đơn hàng trên storefront

## Mục đích

Luồng mua sách của khách trên storefront (FR-21, FR-22, FR-30–FR-33, FR-36, FR-37, FR-40, US-02, BR-03, BR-14): xem
chi tiết sách, thêm vào giỏ, sửa giỏ, đặt hàng COD (chuyển khoản khi đã cấu hình tài khoản nhận tiền), tra cứu đơn, xem và hủy đơn của thành viên (FR-41,
BR-12).
Dùng được cho cả khách vãng lai và thành viên. Đặc tả backend ở `docs/features/cart.md`, `docs/features/ordering.md`
và `docs/api_reference.md`; file này chỉ mô tả phần FE.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **storefront**. Code ở `features/catalog` (trang chi tiết) và `features/ordering` (giỏ, đặt hàng, đơn hàng).

| Route                    | Render                         | Nội dung                                                     |
| ------------------------ | ------------------------------ | ------------------------------------------------------------ |
| `/sach/<slug>`           | Server, động                   | Chi tiết sách, chọn ấn bản `?an-ban=<id>`, form thêm vào giỏ |
| `/gio-hang`              | Tĩnh, giỏ tải ở trình duyệt    | Sửa số lượng, xóa dòng, tổng dự kiến, nút Đặt hàng           |
| `/thanh-toan`            | Tĩnh, giỏ tải ở trình duyệt    | Form giao hàng + tóm tắt giỏ; đặt xong hiện màn cảm ơn       |
| `/don-hang/tra-cuu?ma=…` | Server, động (điền sẵn `?ma=`) | Tra cứu đơn bằng mã đơn + số điện thoại                      |
| `/don-hang?page=…`       | Khung server, đơn tải ở client | Đơn của tôi (cần đăng nhập), 10 đơn/trang                    |
| `/don-hang/<mã>`         | Khung server, đơn tải ở client | Chi tiết đơn của tôi, hủy đơn                                |

Giỏ hàng, thanh toán, tra cứu và đơn hàng đặt `noindex`; trang chi tiết sách được index.

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
- **Bố cục**: cột trái là mô hình sách 3D (`Book3D` cỡ `detail`, dùng chung với hero) nghiêng theo chuột
  (`HeroSpotlight`), dính theo khi cuộn trên desktop, kèm link "Đọc thử" (chỉ nhận `https://`). Cột phải theo thứ tự: tên
  sách, ấn bản, khối đặt mua, thông tin xuất bản thu gọn, giới thiệu sách, mục lục; giới thiệu nằm ngay dưới khối đặt
  mua để khách đọc được trong màn hình đầu.
- **Thông tin xuất bản** (FR-21), dạng lưới chữ nhỏ 2–3 cột: ISBN, NXB, số QĐXB, số ĐKXB, năm, ngày phát hành, số
  trang, khổ, trọng lượng, "cập nhật văn bản đến ngày"; bên dưới là danh sách văn bản pháp luật được cập nhật.
- **Mô tả và mục lục** (`formatRichText`, `features/catalog/description.ts`, chạy trên server): Admin nhập **HTML hoặc
  chữ thuần** (dữ liệu thật hiện là chữ thuần có xuống dòng). Chữ thuần được chuyển thành HTML: dòng trống tách đoạn `<p>`,
  xuống dòng đơn thành `<br>`, dòng `-----` thành `<hr>`. Sau đó lọc bằng `sanitize-html`, chỉ giữ
  `p, br, hr, strong, b, em, i, u, ul, ol, li, h2–h4, blockquote, a[href http/https/mailto]`; `h1` hạ thành `h2`; link
  mở tab mới với `rel="nofollow noopener noreferrer"`. Mục lục nằm trong khối thu gọn "Mục lục". Meta description:
  `metaDescription`, nếu trống thì 160 ký tự đầu của mô tả.
- **Giá khuyến mãi**: giá đang áp dụng `salePrice`, giá bìa `listPrice` gạch ngang, nhãn `-discountPercent%`; đang khuyến
  mãi thì thêm "Giá thường" (`regularSalePrice`, khi khác giá bìa) và "Giá ưu đãi đến …" (`saleEndsAt`, giờ Việt Nam).
  JSON-LD `Offer` có `priceValidUntil`. Hộp "Xem nhanh" ở tủ sách cũng hiện hạn ưu đãi.
- Header sách có thêm dòng danh mục (link về tủ sách đã lọc).
- **SEO**: `generateMetadata` (title, description, canonical, Open Graph `book` + ảnh bìa), JSON-LD
  `Book`+`Product`/`Offer` (mỗi SKU một offer, `InStock`/`OutOfStock`/`Discontinued`) và `BreadcrumbList` (NFR-31),
  ký tự `<` được đổi thành mã thoát Unicode (`serializeJsonLd`) để dữ liệu không đóng được thẻ `<script>`.

### Thêm nhanh từ thẻ sách

- Thẻ sách ở tủ sách và trang chủ có nút giỏ (icon) ở dòng giá; hộp "Xem nhanh" có nút "Thêm vào giỏ". Chỉ hiện khi sách
  đang bán và còn hàng. `BookCard` (catalog) nhận nút qua prop `cartAction`/`dialogCartAction`, trang truyền
  `QuickAddButton` (ordering) vào, nên hai feature không import lẫn nhau.
- `GET /books` không có SKU nên khi bấm, `QuickAddButton` gọi `GET /books/{slug}` từ trình duyệt và chọn SKU của ấn bản
  mới nhất đang bán, còn hàng, **giá rẻ nhất** (đúng giá thẻ đang hiện), rồi `POST /cart/items` 1 cuốn
  (`pickQuickAddSku`, `features/ordering/quick-add.ts`). Không còn SKU mua được thì mở trang chi tiết.
- Phản hồi: nút chuyển sang dấu tích, thông báo "Đã thêm 1 cuốn (bìa …) vào giỏ. Xem giỏ" nổi phía trên dòng giá
  (không xê dịch lưới) trong 3,5 giây; số trên icon giỏ ở header cập nhật ngay. Lỗi hiện theo `code`.

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
  (`shippingAddress.ward`, `invoiceInfo.taxCode`) nên lỗi `VALIDATION_ERROR` hiện đúng ô. Mã số thuế kiểm tra bằng
  `lib/tax-code.ts`, dùng chung với trang tài khoản.
- **Thành viên** (xem `docs/features/storefront-account.md`): điền sẵn họ tên, số điện thoại, email từ hồ sơ (chỉ vào ô
  còn trống). Có sổ địa chỉ thì hiện danh sách "Địa chỉ đã lưu" để chọn, địa chỉ mặc định chọn sẵn; chọn "Địa chỉ khác"
  thì nhập mới và được tích "Lưu địa chỉ này vào sổ địa chỉ" (sổ chưa đủ 10). Địa chỉ được lưu sau khi đặt đơn thành
  công; lưu lỗi chỉ báo nhẹ trên màn cảm ơn, không ảnh hưởng đơn.
- **Idempotency-Key**: `crypto.randomUUID()` sinh một lần mỗi lần vào trang, giữ nguyên khi bấm lại. Nút bị khóa trong
  lúc gửi. Backend trả `IDEMPOTENCY_KEY_REUSED` → sinh key mới và gửi lại **một lần**.
- Lỗi do giỏ đã đổi (`CART_EMPTY`, `SKU_NOT_AVAILABLE`, `MAX_QTY_EXCEEDED`, `OUT_OF_STOCK`): hiện thông báo + link
  "Xem lại giỏ hàng", tải lại giỏ. Giỏ có dòng lỗi thì vẫn giữ form (không mất thông tin đã nhập) nhưng khóa nút.
- **Thành công**: làm trống giỏ trong cache (backend đã xóa giỏ), hiện màn cảm ơn ngay tại trang (`OrderPlaced`): mã đơn,
  chi tiết đơn; khách vãng lai được nhắc lưu mã + số điện thoại và link tra cứu, thành viên có link "Xem đơn của tôi"
  (`/don-hang/<mã>`). Đơn **không** lưu vào storage của trình duyệt vì có dữ liệu cá
  nhân; tải lại trang thì mất màn cảm ơn, khách tra cứu bằng mã đơn.
- **Chuyển khoản**: chỉ hiện khi `BANK_ACCOUNT` trong `features/ordering/payment.ts` khác `null`. Khi đó màn cảm ơn hiện
  ngân hàng, số tài khoản, chủ tài khoản, số tiền, nội dung = mã đơn và đồng hồ đếm ngược tới `paymentExpiresAt`
  (30 phút).

### Tra cứu đơn `/don-hang/tra-cuu`

- Mã đơn (tự viết hoa) + số điện thoại đặt hàng → `POST /orders/lookup`. Hiện trạng thái, thanh toán, ngày đặt, sách,
  tiền, địa chỉ, hóa đơn, dòng thời gian trạng thái (`history`, FR-40).
- `NOT_FOUND` → "Không tìm thấy đơn hàng…"; `TOO_MANY_REQUESTS` (10 lần/phút/IP) → "thao tác quá nhanh".
- Đơn còn hủy được (`canCancel`): hướng dẫn liên hệ CSKH (khách vãng lai chưa tự hủy được qua API).

### Đơn của tôi `/don-hang`, `/don-hang/<mã>`

- Chỉ cho thành viên: API cần Bearer (access token nằm trong bộ nhớ trình duyệt) nên trang server chỉ dựng khung, dữ
  liệu tải ở client bằng TanStack Query (`features/ordering/useOrders.ts`, key `["orders", <người dùng>, …]`). Phiên
  dùng chung hook `useSession` (`src/lib/use-session.ts`) với giỏ hàng.
- Chưa đăng nhập (`SignInRequired`): mời đăng nhập với `?next=` quay lại đúng trang, hoặc tra cứu bằng mã đơn (đơn đặt
  khi chưa đăng nhập không nằm trong tài khoản). Refresh token hết hạn thì phiên chuyển `anonymous` và cũng hiện màn này.
- Header: thành viên có link **"Đơn của tôi"** cạnh tên và Đăng xuất. Trên mobile tài khoản chỉ hiện icon (chữ vẫn có
  cho trình đọc màn hình) để logo, giỏ, tài khoản nằm một hàng.
- **Danh sách**: mã đơn, ngày đặt, nhãn trạng thái (màu theo nhóm chờ / đang xử lý / đã giao / đã đóng), tổng tiền,
  số cuốn, phương thức thanh toán; mỗi dòng là link sang chi tiết. Phân trang `?page=` (Trang trước/sau), giữ dữ liệu trang
  cũ trong lúc tải trang mới. Chưa có đơn → nhắc đơn vãng lai tra cứu bằng mã.
- **Chi tiết**: như màn tra cứu (`OrderDetails`), thêm hướng dẫn chuyển khoản + đếm ngược khi đơn chuyển khoản chưa
  thanh toán (`BankTransferInfo`, dùng chung với màn cảm ơn). `404` (đơn của tài khoản khác, mã sai) → "Không tìm thấy
  đơn hàng". Mã đơn trên URL được viết hoa; `%` lỗi không làm hỏng trang.
- **Hủy đơn** khi `canCancel` (BR-12): nút "Hủy đơn hàng" mở dialog có ô lý do (không bắt buộc, ≤ 1000 ký tự, rỗng gửi
  `null`). Thành công: thay đơn bằng response, tải lại danh sách, hiện "Đã hủy đơn hàng.", đưa focus về khung đơn.
  `ORDER_NOT_CANCELLABLE` (đơn vừa được đóng gói/thanh toán) → thông báo trong dialog và tải lại đơn. Đơn không hủy được
  thì hiện hướng dẫn liên hệ CSKH.

## API backend sử dụng (method, route, mã lỗi được xử lý)

Trang chi tiết gọi từ server qua `serverApi` (cache 60 giây). Các API còn lại gọi từ trình duyệt qua proxy `/api/v1`
bằng `browserApi()` của `@slvn/auth` (gửi cookie `sl_cart`, gắn Bearer khi đã đăng nhập).

| Method | Route                          | Dùng cho                 | Mã lỗi xử lý riêng                                                   |
| ------ | ------------------------------ | ------------------------ | -------------------------------------------------------------------- |
| GET    | `/api/v1/books/{slug}`         | Trang chi tiết           | 404 → trang không tìm thấy                                           |
| GET    | `/api/v1/cart`                 | Header, giỏ, thanh toán  | —                                                                    |
| POST   | `/api/v1/cart/items`           | Thêm vào giỏ (cộng thêm) | `MAX_QTY_EXCEEDED`, `OUT_OF_STOCK`, `SKU_NOT_AVAILABLE`, `CART_FULL` |
| PATCH  | `/api/v1/cart/items/{skuId}`   | Đổi số lượng             | như trên                                                             |
| DELETE | `/api/v1/cart/items/{skuId}`   | Xóa dòng                 | —                                                                    |
| POST   | `/api/v1/shipping/quote`       | Phí ship dự kiến         | lỗi → ẩn dòng phí                                                    |
| POST   | `/api/v1/orders`               | Đặt hàng                 | `VALIDATION_ERROR` theo field, `IDEMPOTENCY_KEY_REUSED`, lỗi giỏ     |
| POST   | `/api/v1/orders/lookup`        | Tra cứu đơn              | `NOT_FOUND`, `TOO_MANY_REQUESTS`                                     |
| GET    | `/api/v1/orders`               | Đơn của tôi (Bearer)     | 401 → refresh một lần, hết phiên thì mời đăng nhập                   |
| GET    | `/api/v1/orders/{code}`        | Chi tiết đơn (Bearer)    | `NOT_FOUND`                                                          |
| POST   | `/api/v1/orders/{code}/cancel` | Hủy đơn (Bearer)         | `ORDER_NOT_CANCELLABLE`                                              |

- Response parse bằng Zod (`features/catalog/schemas.ts`, `features/ordering/schemas.ts`) vì OpenAPI sinh enum thành
  `number`, số thành `number | string`.
- Body `POST /orders` gửi `paymentMethod` dạng chuỗi (`cod`) có `// @ts-expect-error` trong `features/ordering/api.ts`
  vì type sinh ra là `number`. Khi backend sửa OpenAPI, TypeScript sẽ báo dòng này để gỡ.
- Lỗi 5xx hiện thông báo chung kèm `traceId`; mất mạng hiện "Không kết nối được máy chủ".

## Cấu hình cần thiết (biến môi trường)

Không thêm biến môi trường. Dùng `API_BASE_URL`, `PROXY_SECRET` như các trang khác.

Thêm package `sanitize-html` (+ `@types/sanitize-html`) cho storefront, chỉ dùng trên server.

### Trạng thái đang tải

`BookLoader` (`src/components/BookLoader.tsx`, CSS `book-loader` trong `globals.css`): cuốn sách mở bìa navy viền vàng,
3 trang giấy ngà lật nối tiếp bằng CSS 3D, sách nổi nhẹ, chữ trạng thái màu vàng. Có `role="status"`, không cần
JavaScript. Dùng ở `app/loading.tsx` (chung), `app/sach/loading.tsx`, `app/sach/[slug]/loading.tsx` và trạng thái tải
giỏ, thanh toán, đơn hàng. Bật giảm chuyển động thì chỉ còn cuốn sách mở đứng yên.

## Hạn chế / việc còn lại

- **Thông tin tài khoản nhận chuyển khoản chưa có**: `BANK_ACCOUNT = null` nên chỉ có COD. Điền ngân hàng, số tài khoản,
  chủ tài khoản vào `features/ordering/payment.ts` để bật chuyển khoản. `TrustBand` vẫn ghi "hoặc chuyển khoản".
- Backend Render (kiểm tra 24/10/2026): `POST /cart/items`, `DELETE /cart/items/{id}` trả 500 `INTERNAL_ERROR`,
  `/health/ready` trả 503 (Redis/CSDL chưa sẵn sàng); `GET /cart`, `GET /books/{slug}`, `POST /shipping/quote` chạy
  được. Chưa thử được thêm giỏ và đặt hàng end-to-end với backend thật.
- Slug không tồn tại trả HTTP **200** kèm `noindex` (không phải 404), vì `loading.tsx` đã bắt đầu stream trước khi
  `notFound()` chạy (hành vi của Next.js 16). Muốn 404 thật thì kiểm tra slug trong Proxy hoặc bỏ `loading.tsx`.
- JSON-LD dùng URL tương đối vì chưa có domain chính thức (chưa cấu hình `metadataBase`).
- Chưa có màn quản lý đơn ở Admin. Khách vãng lai chưa tự hủy được đơn (backend chỉ cho hủy với Bearer).
- Chưa thử được "Đơn của tôi" với backend thật (cần tài khoản khách và backend có Redis/CSDL sẵn sàng); test dùng MSW và
  Playwright giả lập API.
- Tỉnh/thành, phường/xã là ô nhập tự do (chưa có danh mục địa giới 2 cấp).
- Chưa điền sẵn phần "Xuất hóa đơn công ty" từ `invoiceInfo` của hồ sơ, chưa có checkbox lưu thông tin hóa đơn
  (`PUT /me/invoice-info`).
- Chưa có mã giảm giá (backend chưa có `/cart/apply-coupon`), pre-order, cổng thanh toán online.
- Chưa có số hotline CSKH để hiện ở chỗ "liên hệ CSKH" (báo giá sỉ, hủy đơn).
- `regularSalePrice`, `saleEndsAt` chưa có trong `docs/api_reference.md` (lấy theo response mẫu backend gửi 24/10/2026);
  schema để `nullish` nên response cũ chưa có field vẫn đọc được.
- Nhiều đầu sách thật đang để "Đang cập nhật" hoặc trống ở NXB, số QĐXB, số trang, khổ… (thông tin lại nằm trong mô
  tả): cần nhập đúng field ở Admin để hiện trong "Thông tin xuất bản" và JSON-LD.
- Breadcrumb danh mục dùng `/sach?category=<slug>` vì chưa có route `/danh-muc/<slug>` (NFR-30).

## Kiểm tra

Unit test: chọn ấn bản, trạng thái bán, thông tin xuất bản, JSON-LD, lọc mô tả HTML, dòng lỗi giỏ, chặn đặt hàng, phí
ship, thông báo lỗi, đếm ngược, schema form đặt hàng/tra cứu. Component test (MSW): thêm vào giỏ (chọn bìa, xác nhận ấn
bản cũ, lỗi), giỏ hàng (sửa, xóa, cảnh báo), đặt hàng (validate, `Idempotency-Key`, lỗi theo field, hóa đơn, thử lại
key, hết hàng, chuyển khoản, link đơn cho thành viên), tra cứu đơn, đơn của tôi (danh sách, phân trang, chưa đăng
nhập), chi tiết đơn (hủy có/không lý do, không hủy được, 404, chuyển khoản). Playwright: luồng mua COD và luồng thành
viên mở đơn rồi hủy (API giả lập), desktop + mobile.
