# Sách Luật Việt Nam — API Reference cho Frontend

Oct 23, 2026 · @Software DGP

## Tổng quan

Mọi API nằm dưới tiền tố `/api/v1`, trả JSON (camelCase), lỗi theo một format duy nhất (Problem Details, mục Quy ước chung). Tài liệu này khớp code backend tại commit trên `main` ngày 23/10/2026; nguồn chuẩn để tra nhanh là OpenAPI.

| Môi trường           | Base URL                 | Ghi chú                                            |
| -------------------- | ------------------------ | -------------------------------------------------- |
| Local (HTTP)         | `http://localhost:5279`  | `dotnet run --project src/SachLuat.Api`            |
| Local (HTTPS)        | `https://localhost:7265` | profile `https`, nên dùng khi test cookie `Secure` |
| Staging / Production | Chưa có                  | Chưa deploy                                        |

- **OpenAPI JSON**: `/openapi/v1.json` · **API reference (Scalar)**: `/scalar` — chỉ bật ở Development.
- **Health**: `GET /health/live` (tiến trình sống), `GET /health/ready` (CSDL + Redis sẵn sàng). Không có tiền tố `/api/v1`.
- **Cookie**: backend dùng 2 cookie HttpOnly (refresh token, giỏ khách). Mọi request từ trình duyệt phải gửi kèm cookie: `fetch(url, { credentials: 'include' })` hoặc axios `withCredentials: true`.
- **CORS chưa cấu hình**: trình duyệt gọi thẳng từ domain khác sẽ bị chặn. Đề xuất cho Next.js: proxy qua `rewrites` (`/api/v1/:path*` → backend) để cùng origin; refresh cookie là `SameSite=Strict` nên production cần FE và API **cùng site** (ví dụ `sachluat.vn` và `api.sachluat.vn`).
- Ký hiệu trong bảng: `?` sau tên field = không bắt buộc / có thể `null`; kiểu `decimal` = số VNĐ nguyên (không phần lẻ); `DateOnly` = `"2026-10-23"`; `DateTime` = ISO 8601 UTC (`"2026-10-23T03:00:00Z"`).

## Quy ước chung

FE cần nắm 6 quy ước dưới đây; mọi endpoint ở các mục sau đều theo đúng chúng.

### Xác thực

- Gửi access token trong header: `Authorization: Bearer <accessToken>`. Token sống **15 phút** (`expiresIn = 900` giây). Lưu trong bộ nhớ (state), không lưu `localStorage`.
- Refresh token nằm trong cookie HttpOnly `sl_refresh`, JS không đọc được. Khi API trả 401: gọi `POST /api/v1/auth/refresh` (kèm cookie) lấy token mới rồi gọi lại request; refresh cũng 401 (`INVALID_REFRESH_TOKEN`) thì chuyển về màn đăng nhập.
- Chỉ **một** request refresh chạy tại một thời điểm (dùng chung một promise): mỗi lần refresh, token cũ bị thu hồi; hai request refresh song song với cùng cookie sẽ bị coi là dùng lại token và **đăng xuất mọi phiên**.
- API Admin (`/api/v1/admin/...`) cần đúng vai trò **và** phiên đã qua 2FA; thiếu thì 403.

### Cookie do backend đặt

| Cookie       | Nội dung                  | Path           | Thuộc tính                                                                          |
| ------------ | ------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| `sl_refresh` | Refresh token             | `/api/v1/auth` | HttpOnly, Secure, SameSite=Strict; 30 ngày nếu `rememberMe`, ngược lại cookie phiên |
| `sl_cart`    | Mã giỏ của khách vãng lai | `/api/v1`      | HttpOnly, Secure, SameSite=Lax; 30 ngày                                             |

FE không tự đọc/ghi hai cookie này, chỉ cần `credentials: 'include'`.

### Format lỗi

Mọi lỗi trả `Content-Type: application/problem+json`. FE rẽ nhánh theo **`code`**, hiển thị **`title`** cho khách (tiếng Việt với lỗi nghiệp vụ), gửi **`traceId`** khi báo lỗi cho backend.

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.10",
  "title": "Sách đã hết hàng hoặc không đủ số lượng",
  "status": 409,
  "code": "OUT_OF_STOCK",
  "traceId": "00-4d7b940b2826d50560bd32b108088a36-69d502dc7f11d19b-00"
}
```

Lỗi validate (400, `code = VALIDATION_ERROR`) có thêm `errors`: key = tên field camelCase, value = danh sách thông báo.

```json
{
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": { "limit": ["'Limit' must be between 1 and 100. You entered 500."], "sort": ["Kiểu sắp xếp không hợp lệ"] },
  "code": "VALIDATION_ERROR",
  "traceId": "00-..."
}
```

- Field lồng: `shippingAddress.ward`, `lines[0].unitCost`. Thông báo validate mặc định có thể là tiếng Anh; FE nên tự hiển thị nhãn tiếng Việt theo field.
- JSON sai cú pháp hoặc sai kiểu (gửi chữ vào field số) cũng là 400 `VALIDATION_ERROR`, key có dạng `$.quantity`.
- Lỗi 500: `code = INTERNAL_ERROR`, `title` chung chung, không có chi tiết kỹ thuật.

### Phân trang

Query `?page=1&limit=24` (`page` ≥ 1, mặc định 1; `limit` 1–100, mặc định 24). Response:

```json
{ "items": [ ... ], "meta": { "page": 1, "limit": 24, "total": 135 } }
```

Số trang = `ceil(total / limit)`.

### Enum và kiểu dữ liệu

- Enum luôn là chuỗi **snake\_case**, cả trong body JSON, response lẫn query string: `on_sale`, `bank_transfer`, `pending_confirm`. Danh sách đầy đủ ở mục Bảng enum.
- Tiền: số nguyên VNĐ (`150000`), đã gồm VAT.
- Ngày: `"2026-10-23"`; thời điểm: ISO 8601 UTC, FE tự đổi sang giờ Việt Nam khi hiển thị.

### Idempotency-Key và giới hạn tần suất

- `POST /api/v1/orders` nhận header `Idempotency-Key` (tối đa 64 ký tự). Tạo **một UUID cho mỗi lần vào trang thanh toán**, giữ nguyên khi retry hay khách bấm nhiều lần: backend trả lại đúng đơn đã tạo thay vì tạo đơn trùng.
- `/api/v1/auth/*` và `/api/v1/orders/lookup`: tối đa **10 request/phút/IP**, vượt → 429 `TOO_MANY_REQUESTS`.

## Auth và tài khoản

Khách đăng ký/đăng nhập bằng email + mật khẩu; nhân viên có thêm bước mã 6 số từ ứng dụng authenticator. Mọi endpoint `/auth/*` bị giới hạn 10 request/phút/IP.

| Method | Route                          | Xác thực | Request body                       | Response                                         |
| ------ | ------------------------------ | -------- | ---------------------------------- | ------------------------------------------------ |
| POST   | `/api/v1/auth/register`        | Không    | `RegisterRequest`                  | 201 `AuthResponse` + cookie                      |
| POST   | `/api/v1/auth/login`           | Không    | `LoginRequest`                     | 200 `LoginResponse` (+ cookie nếu không cần 2FA) |
| POST   | `/api/v1/auth/login/2fa`       | Không    | `{ twoFactorToken, code }`         | 200 `AuthResponse` + cookie                      |
| POST   | `/api/v1/auth/refresh`         | Cookie   | không có                           | 200 `AuthResponse` + cookie mới                  |
| POST   | `/api/v1/auth/logout`          | Cookie   | không có                           | 204, xóa cookie                                  |
| POST   | `/api/v1/auth/password/change` | Bearer   | `{ currentPassword, newPassword }` | 204, thu hồi mọi phiên                           |
| POST   | `/api/v1/auth/2fa/setup`       | Bearer   | không có                           | 200 `{ sharedKey, authenticatorUri }`            |
| POST   | `/api/v1/auth/2fa/enable`      | Bearer   | `{ code }`                         | 200 `AuthResponse` (phiên đã qua 2FA)            |
| GET    | `/api/v1/me`                   | Bearer   | —                                  | 200 `UserResponse`                               |
| PATCH  | `/api/v1/me`                   | Bearer   | `UpdateProfileRequest`             | 200 `UserResponse`                               |

### Request

| Kiểu                   | Field                            | Kiểu dữ liệu | Ràng buộc                                                                |
| ---------------------- | -------------------------------- | ------------ | ------------------------------------------------------------------------ |
| `RegisterRequest`      | `email`                          | string       | email hợp lệ, ≤ 256                                                      |
|                        | `password`                       | string       | 8–128 ký tự                                                              |
|                        | `fullName`                       | string       | bắt buộc, ≤ 255                                                          |
|                        | `phoneNumber?`                   | string       | `0xxxxxxxxx` hoặc `+84xxxxxxxxx` (9 số sau tiền tố)                      |
| `LoginRequest`         | `email`, `password`              | string       | bắt buộc                                                                 |
|                        | `rememberMe?`                    | boolean      | mặc định `false`; `true` = giữ đăng nhập 30 ngày, `false` = phiên 12 giờ |
| 2FA                    | `twoFactorToken`                 | string       | lấy từ `LoginResponse`, hạn 5 phút                                       |
|                        | `code`                           | string       | đúng 6 chữ số                                                            |
| Đổi mật khẩu           | `currentPassword`, `newPassword` | string       | mật khẩu mới 8–128 ký tự                                                 |
| `UpdateProfileRequest` | `fullName`                       | string       | **bắt buộc** (PATCH gửi đủ cả 4 field), ≤ 255                            |
|                        | `phoneNumber?`                   | string       | như trên; `null` = xóa                                                   |
|                        | `birthDate?`                     | DateOnly     | `"1995-05-20"`                                                           |
|                        | `occupation?`                    | enum         | `student`, `lawyer`, `accountant`, `other`                               |

### Response

```json
// AuthResponse
{
  "accessToken": "eyJhbGciOi...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": 12,
    "email": "khach@example.com",
    "fullName": "Nguyễn Văn A",
    "phoneNumber": "0901234567",
    "birthDate": null,
    "occupation": null,
    "roles": ["customer"],
    "twoFactorEnabled": false,
    "requiresTwoFactorSetup": false
  }
}

// LoginResponse — tài khoản chưa bật 2FA
{ "requiresTwoFactor": false, "twoFactorToken": null, "session": { /* AuthResponse */ } }

// LoginResponse — tài khoản đã bật 2FA: gọi tiếp /auth/login/2fa
{ "requiresTwoFactor": true, "twoFactorToken": "eyJ...", "session": null }

// /auth/2fa/setup
{ "sharedKey": "JBSWY3DPEHPK3PXP...", "authenticatorUri": "otpauth://totp/Sach%20Luat%20Viet%20Nam:admin%40...?secret=...&issuer=...&digits=6" }
```

`UserResponse` (của `/me`) có đúng các field của `user` ở trên. `requiresTwoFactorSetup = true` nghĩa là tài khoản nhân viên chưa bật 2FA: FE đưa thẳng sang màn bật 2FA.

### Luồng bật 2FA cho nhân viên

1. Đăng nhập bằng mật khẩu → nhận `session`, `user.requiresTwoFactorSetup = true`. Gọi API Admin lúc này sẽ bị 403.
2. `POST /auth/2fa/setup` → hiển thị QR từ `authenticatorUri` (kèm `sharedKey` để nhập tay).
3. Nhân viên quét QR, nhập mã 6 số → `POST /auth/2fa/enable` → thay access token bằng token mới trong response. Các phiên cũ bị thu hồi.
4. Từ lần sau: `/auth/login` trả `requiresTwoFactor = true` → hỏi mã 6 số → `/auth/login/2fa`.

### Lỗi thường gặp

| HTTP | `code`                       | Khi nào                                                       |
| ---- | ---------------------------- | ------------------------------------------------------------- |
| 401  | `INVALID_CREDENTIALS`        | Sai email/mật khẩu (kể cả mật khẩu hiện tại khi đổi mật khẩu) |
| 423  | `ACCOUNT_LOCKED`             | Sai 5 lần liên tiếp → khóa 15 phút                            |
| 409  | `EMAIL_TAKEN`                | Email đã đăng ký                                              |
| 401  | `INVALID_REFRESH_TOKEN`      | Cookie thiếu/hết hạn/đã thu hồi → đăng nhập lại               |
| 401  | `TWO_FACTOR_TOKEN_INVALID`   | `twoFactorToken` quá 5 phút → đăng nhập lại từ đầu            |
| 400  | `OTP_INVALID`                | Mã 6 số sai (tính vào 5 lần sai)                              |
| 409  | `TWO_FACTOR_ALREADY_ENABLED` | Gọi setup/enable khi đã bật                                   |
| 429  | `TOO_MANY_REQUESTS`          | Quá 10 request/phút                                           |

Chưa có: xác thực email/OTP SMS, quên mật khẩu, đăng nhập Google/Facebook/Zalo, sổ địa chỉ.

## Catalog (website)

Ba endpoint công khai, không cần đăng nhập. Chỉ trả đầu sách `active` có ấn bản mới nhất đã công bố (không còn `draft`).

### GET /api/v1/books — danh sách, lọc, sắp xếp

| Query param            | Kiểu             | Mặc định | Ý nghĩa                                                                                       |
| ---------------------- | ---------------- | -------- | --------------------------------------------------------------------------------------------- |
| `q`                    | string ≤ 200     | —        | Tên sách chứa chuỗi (không phân biệt hoa thường, **có phân biệt dấu**), hoặc đúng ISBN 13 số  |
| `category`             | slug             | —        | Danh mục, gồm cả danh mục con. Slug không tồn tại → danh sách rỗng                            |
| `type`                 | `BookType`       | —        | `code`, `consolidated`, `commentary`, `qna`, `textbook`, `monograph`                          |
| `audience`             | `TargetAudience` | —        | `student`, `lawyer`, `business`, `citizen`                                                    |
| `cover`                | `CoverType`      | —        | `paperback`, `hardcover` (theo SKU của ấn bản mới nhất)                                       |
| `minPrice`, `maxPrice` | số ≥ 0           | —        | Khoảng giá bán của ấn bản mới nhất; `maxPrice` ≥ `minPrice`                                   |
| `legalDocument`        | string ≤ 50      | —        | Số hiệu văn bản, ví dụ `91/2015/QH13` (encode `/` thành `%2F` nếu thư viện HTTP không tự làm) |
| `sort`                 | string           | `newest` | `newest` (ngày phát hành ấn bản mới nhất), `price_asc`, `price_desc`                          |
| `page`, `limit`        | số               | 1, 24    | `limit` tối đa 100                                                                            |

```json
{
  "items": [
    {
      "id": 1,
      "title": "Bộ luật Dân sự 2026",
      "slug": "bo-luat-dan-su-2026",
      "bookType": "code",
      "editionName": "Tái bản lần 3 – 2026",
      "publishYear": 2026,
      "coverImageUrl": "https://cdn.../bia.jpg",
      "updatedToText": "Cập nhật đến Bộ luật Dân sự 91/2015/QH13",
      "editionStatus": "on_sale",
      "salePrice": 150000,
      "listPrice": 200000,
      "discountPercent": 25,
      "inStock": true
    }
  ],
  "meta": { "page": 1, "limit": 24, "total": 1 }
}
```

- Giá là SKU **rẻ nhất** của ấn bản mới nhất; `salePrice`, `listPrice`, `discountPercent` = `null` khi ấn bản chưa có SKU.
- `discountPercent` đã làm tròn xuống (không hiện “giảm 0%” ảo). `inStock` = ít nhất một SKU còn tồn khả dụng.

### GET /api/v1/books/{slug} — chi tiết sách

Trả 404 `NOT_FOUND` nếu slug không có hoặc sách đang ẩn. `editions` gồm mọi ấn bản trừ `draft`, **ấn bản mới nhất đứng đầu**, các ấn bản cũ theo ngày phát hành giảm dần.

```json
{
  "id": 1,
  "title": "Bộ luật Dân sự 2026",
  "slug": "bo-luat-dan-su-2026",
  "description": "<p>Mô tả HTML...</p>",
  "bookType": "code",
  "targetAudiences": ["student", "lawyer"],
  "metaTitle": "...",
  "metaDescription": "...",
  "categories": [{ "id": 3, "name": "Dân sự", "slug": "dan-su" }],
  "authors": [{ "id": 2, "name": "Ban biên tập", "slug": "ban-bien-tap" }],
  "editions": [
    {
      "id": 10,
      "editionName": "Tái bản lần 3 – 2026",
      "isbn": "9780306406157",
      "publisher": "NXB Tư pháp",
      "publishingDecisionNo": "123/QĐ-NXBTP",
      "registrationNo": null,
      "publishYear": 2026,
      "updatedToText": "Cập nhật đến ...",
      "updatedToDate": "2026-07-01",
      "pages": 820,
      "size": "16x24 cm",
      "weightGram": 600,
      "coverImageUrl": "https://cdn.../bia.jpg",
      "previewFileUrl": null,
      "tableOfContents": "Phần thứ nhất...",
      "releaseDate": "2026-08-01",
      "isLatest": true,
      "status": "on_sale",
      "skus": [
        {
          "id": 100,
          "skuCode": "SLVN-BLDS-2026-BM",
          "coverType": "paperback",
          "listPrice": 200000,
          "salePrice": 150000,
          "discountPercent": 25,
          "allowPreorder": false,
          "inStock": true
        }
      ],
      "legalDocuments": [
        {
          "id": 5,
          "docNumber": "91/2015/QH13",
          "docType": "code",
          "title": "Bộ luật Dân sự",
          "issuedDate": "2015-11-24",
          "effectiveDate": "2017-01-01"
        }
      ]
    }
  ]
}
```

Gợi ý hiển thị:

- `isLatest = false` → thanh cảnh báo vàng “Đã có ấn bản mới” kèm nút sang ấn bản `editions[0]` (BR-03, US-02).
- Chỉ ấn bản `on_sale` hoặc `clearance` mua được; `upcoming` hiện “Sắp phát hành”, `discontinued` hiện “Ngừng bán”. SKU `inStock = false` → ẩn nút “Thêm vào giỏ”.
- Nhãn “Cập nhật đến” (FR-22) = `updatedToText`; số QĐXB, ISBN, NXB (FR-21) nằm trong edition.
- Chọn ấn bản trên URL (`?an-ban=`) là việc của FE: mọi ấn bản đã có sẵn trong một response.

### GET /api/v1/categories — cây danh mục

Trả mảng gốc, mỗi nút có `children` đệ quy, đã sắp theo thứ tự Admin kéo thả rồi theo tên.

```json
[
  {
    "id": 3,
    "name": "Dân sự",
    "slug": "dan-su",
    "children": [{ "id": 7, "name": "Hợp đồng", "slug": "hop-dong", "children": [] }]
  }
]
```

## Giỏ hàng

Giỏ dùng được cho cả khách vãng lai (cookie `sl_cart`) và thành viên (theo tài khoản); đăng nhập là tùy chọn. Mọi endpoint trả về toàn bộ giỏ sau thay đổi, FE chỉ cần thay state bằng response.

| Method | Route                        | Request body                                                     | Response           |
| ------ | ---------------------------- | ---------------------------------------------------------------- | ------------------ |
| GET    | `/api/v1/cart`               | —                                                                | 200 `CartResponse` |
| POST   | `/api/v1/cart/items`         | `{ "skuId": 100, "quantity": 2 }` — **cộng thêm** vào số đang có | 200 `CartResponse` |
| PATCH  | `/api/v1/cart/items/{skuId}` | `{ "quantity": 3 }` — **đặt** số lượng, `0` = xóa                | 200 `CartResponse` |
| DELETE | `/api/v1/cart/items/{skuId}` | —                                                                | 200 `CartResponse` |
| DELETE | `/api/v1/cart`               | —                                                                | 204                |

Ràng buộc: `skuId` > 0, `quantity` > 0 (POST) hoặc ≥ 0 (PATCH); tối đa **20 cuốn mỗi SKU** (FR-31) và 50 loại sách mỗi giỏ.

```json
{
  "items": [
    {
      "skuId": 100,
      "skuCode": "SLVN-BLDS-2026-BM",
      "bookTitle": "Bộ luật Dân sự 2026",
      "bookSlug": "bo-luat-dan-su-2026",
      "editionName": "Tái bản lần 3 – 2026",
      "coverType": "paperback",
      "coverImageUrl": "https://cdn.../bia.jpg",
      "quantity": 2,
      "unitPrice": 150000,
      "listPrice": 200000,
      "lineTotal": 300000,
      "isLatestEdition": true,
      "isSellable": true,
      "availableQuantity": 13
    }
  ],
  "totalQuantity": 2,
  "subtotal": 300000
}
```

- **Giá luôn lấy mới** từ Catalog mỗi lần đọc giỏ; dòng được sắp theo tên sách.
- `isLatestEdition = false` → hiện hộp xác nhận “Đã có ấn bản mới” **trước khi** gọi POST (US-02); backend không chặn.
- `isSellable = false` (ấn bản ngừng bán sau khi đã thêm) → đánh dấu dòng và yêu cầu xóa; đặt hàng khi còn dòng này sẽ lỗi `SKU_NOT_AVAILABLE`.
- `quantity > availableQuantity` → cảnh báo thiếu hàng. Tồn chỉ được kiểm lúc thêm/sửa và được **giữ khi tạo đơn**, giỏ không giữ hàng.
- SKU bị xóa khỏi Catalog tự biến mất khỏi giỏ.

### Giỏ khách và gộp giỏ khi đăng nhập

1. Khách chưa đăng nhập thêm sách lần đầu → backend đặt cookie `sl_cart` (30 ngày).
2. Sau khi đăng nhập, request đầu tiên tới `/api/v1/cart` có cả Bearer token và cookie → backend cộng giỏ khách vào giỏ tài khoản (mỗi SKU không quá 20), xóa giỏ khách và cookie.
3. FE nên gọi `GET /api/v1/cart` ngay sau khi đăng nhập thành công để việc gộp xảy ra sớm và cập nhật badge giỏ.

### Lỗi

| HTTP | `code`              | Khi nào                                                            |
| ---- | ------------------- | ------------------------------------------------------------------ |
| 422  | `MAX_QTY_EXCEEDED`  | Số lượng sau khi thêm/sửa > 20 → gợi ý form báo giá sỉ             |
| 409  | `OUT_OF_STOCK`      | Tồn khả dụng < số lượng yêu cầu                                    |
| 422  | `SKU_NOT_AVAILABLE` | SKU không tồn tại, sách đang ẩn hoặc ấn bản không ở trạng thái bán |
| 422  | `CART_FULL`         | Đã có 50 loại sách                                                 |

Chưa có: mã giảm giá (`/cart/apply-coupon`).

## Đặt hàng và đơn của khách

Đơn được tạo từ **giỏ hiện tại** (không gửi danh sách sách trong body), đăng nhập là tùy chọn. Giai đoạn này chỉ có COD và chuyển khoản.

| Method | Route                          | Xác thực | Request                                                    | Response                                                        |
| ------ | ------------------------------ | -------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| POST   | `/api/v1/orders`               | Tùy chọn | `CreateOrderRequest` + header `Idempotency-Key`            | 201 `OrderResponse`                                             |
| GET    | `/api/v1/orders?page=&limit=`  | Bearer   | —                                                          | 200 phân trang `OrderSummaryResponse` (mới nhất trước)          |
| GET    | `/api/v1/orders/{code}`        | Bearer   | —                                                          | 200 `OrderResponse` (chỉ đơn của mình, khác → 404)              |
| POST   | `/api/v1/orders/lookup`        | Không    | `{ "orderCode": "SLVN2610230001", "phone": "0901234567" }` | 200 `OrderResponse` (10 request/phút/IP)                        |
| POST   | `/api/v1/orders/{code}/cancel` | Bearer   | `{ "reason": "Đặt nhầm" }` (tùy chọn, ≤ 1000)              | 200 `OrderResponse`                                             |
| POST   | `/api/v1/shipping/quote`       | Không    | `{ "subtotal": 250000 }`                                   | 200 `{ "shippingFee": 30000, "freeShippingThreshold": 300000 }` |

### CreateOrderRequest

| Field                           | Kiểu   | Ràng buộc                                                                                |
| ------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| `customerName`                  | string | bắt buộc, ≤ 255                                                                          |
| `phone`                         | string | `0xxxxxxxxx` hoặc `+84xxxxxxxxx`; dùng lại khi tra cứu đơn                               |
| `email?`                        | string | email hợp lệ, ≤ 256                                                                      |
| `shippingAddress.province`      | string | bắt buộc, ≤ 100 (tỉnh/thành, địa giới 2 cấp)                                             |
| `shippingAddress.ward`          | string | bắt buộc, ≤ 100 (phường/xã)                                                              |
| `shippingAddress.streetAddress` | string | bắt buộc, ≤ 500 (số nhà, đường)                                                          |
| `paymentMethod`                 | enum   | `cod` hoặc `bank_transfer` (`vnpay`, `momo`, `zalopay` → `PAYMENT_METHOD_NOT_SUPPORTED`) |
| `invoiceInfo?`                  | object | gửi khi khách tích “Xuất hóa đơn công ty” (FR-36)                                        |
| `invoiceInfo.companyName`       | string | bắt buộc, ≤ 255                                                                          |
| `invoiceInfo.taxCode`           | string | 10 số, chi nhánh thêm `-xxx` (`0101234567-001`)                                          |
| `invoiceInfo.address`           | string | bắt buộc, ≤ 500                                                                          |
| `invoiceInfo.email`             | string | email nhận hóa đơn                                                                       |
| `note?`                         | string | ≤ 1000                                                                                   |

```json
{
  "customerName": "Nguyễn Văn A",
  "phone": "0901234567",
  "email": "a@example.com",
  "shippingAddress": { "province": "Hà Nội", "ward": "Phường Cầu Giấy", "streetAddress": "1 Xuân Thủy" },
  "paymentMethod": "cod",
  "invoiceInfo": null,
  "note": "Giao giờ hành chính"
}
```

### OrderResponse

```json
{
  "orderCode": "SLVN2610230001",
  "status": "pending_confirm",
  "paymentMethod": "cod",
  "paymentStatus": "unpaid",
  "customerName": "Nguyễn Văn A",
  "phone": "0901234567",
  "email": "a@example.com",
  "shippingAddress": { "province": "Hà Nội", "ward": "Phường Cầu Giấy", "streetAddress": "1 Xuân Thủy" },
  "items": [
    {
      "skuId": 100,
      "skuCode": "SLVN-BLDS-2026-BM",
      "bookTitle": "Bộ luật Dân sự 2026",
      "editionName": "Tái bản lần 3 – 2026",
      "isbn": "9780306406157",
      "coverType": "paperback",
      "unitPrice": 150000,
      "quantity": 5,
      "lineTotal": 750000
    }
  ],
  "subtotal": 750000,
  "discount": 0,
  "shippingFee": 0,
  "total": 750000,
  "invoiceRequired": false,
  "invoiceInfo": null,
  "note": "Giao giờ hành chính",
  "paymentExpiresAt": null,
  "canCancel": true,
  "createdAt": "2026-10-23T03:00:00Z",
  "history": [{ "fromStatus": null, "toStatus": "pending_confirm", "note": null, "createdAt": "2026-10-23T03:00:00Z" }]
}
```

`OrderSummaryResponse` (danh sách đơn): `orderCode, status, paymentMethod, paymentStatus, customerName, phone, itemCount` (tổng số cuốn)`, total, createdAt`.

### Quy tắc FE cần biết

- Thành công → backend **xóa giỏ**; FE xóa state giỏ và chuyển trang cảm ơn với `orderCode`.
- Phí ship: 30.000đ cố định, **miễn phí khi tạm tính ≥ 300.000đ** (BR-14). Dùng `/shipping/quote` để hiển thị trước; con số chốt là `shippingFee` trong response tạo đơn.
- COD → `pending_confirm`. Chuyển khoản → `pending_payment` với `paymentExpiresAt` = tạo đơn + 30 phút; quá hạn chưa đối soát được thì hệ thống **tự hủy** (FE hiển thị đồng hồ đếm ngược). Số tài khoản và nội dung chuyển khoản chưa có API: FE hiển thị nội dung tĩnh, ghi rõ nội dung = `orderCode`.
- Nút “Hủy đơn” hiện theo `canCancel` (BR-12: trước khi đóng gói). Khách vãng lai chưa tự hủy được qua API, cần liên hệ CSKH.
- Đơn của thành viên gắn với tài khoản đang đăng nhập lúc đặt; đơn đặt khi chưa đăng nhập chỉ tra cứu bằng `/orders/lookup`.
- `history` dùng cho dòng thời gian trạng thái (FR-40), sắp cũ → mới.

### Lỗi

| HTTP | `code`                         | Khi nào                                                                                             |
| ---- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| 422  | `CART_EMPTY`                   | Giỏ trống                                                                                           |
| 422  | `SKU_NOT_AVAILABLE`            | Giỏ có dòng `isSellable = false`                                                                    |
| 422  | `MAX_QTY_EXCEEDED`             | Một SKU > 20 cuốn                                                                                   |
| 409  | `OUT_OF_STOCK`                 | Không đủ tồn lúc đặt; chưa tạo đơn, giỏ giữ nguyên → gọi lại `GET /cart` để xem `availableQuantity` |
| 422  | `PAYMENT_METHOD_NOT_SUPPORTED` | Phương thức ngoài COD/chuyển khoản                                                                  |
| 409  | `IDEMPOTENCY_KEY_REUSED`       | Key đã dùng cho đơn của người khác/số điện thoại khác → tạo key mới                                 |
| 422  | `ORDER_NOT_CANCELLABLE`        | Đơn đã thanh toán hoặc đã đóng gói                                                                  |
| 404  | `NOT_FOUND`                    | Sai mã đơn, sai số điện thoại, hoặc đơn không phải của mình                                         |

## Admin — người dùng và phân quyền

Mọi API dưới `/api/v1/admin` yêu cầu Bearer token của nhân viên **đã qua 2FA** và đúng vai trò trong bảng dưới; thiếu token → 401, sai vai trò hoặc chưa 2FA → 403 `FORBIDDEN`. FE nên ẩn menu theo `user.roles`.

| Nhóm API                                                                                      | super\_admin | product\_manager | warehouse\_keeper | order\_manager | customer\_service | accountant |
| --------------------------------------------------------------------------------------------- | ------------ | ---------------- | ----------------- | -------------- | ----------------- | ---------- |
| Catalog (`/admin/books`, `/editions`, `/skus`, `/categories`, `/authors`, `/legal-documents`) | Có           | Có               | —                 | —              | —                 | —          |
| Kho (`/admin/inventory/...`)                                                                  | Có           | —                | Có                | —              | —                 | —          |
| Duyệt/từ chối phiếu nhập                                                                      | Có           | —                | —                 | —              | —                 | —          |
| Xem đơn (`GET /admin/orders`)                                                                 | Có           | —                | —                 | Có             | Có                | Có         |
| Đổi trạng thái đơn                                                                            | Có           | —                | —                 | Có             | —                 | —          |
| Người dùng (`/admin/users`)                                                                   | Có           | —                | —                 | —              | —                 | —          |

Vai trò `marketing` đã có nhưng chưa có API nào dành cho nó; khách hàng có vai trò `customer`.

### Endpoint

| Method | Route                              | Request                                               | Response                                      |
| ------ | ---------------------------------- | ----------------------------------------------------- | --------------------------------------------- |
| GET    | `/api/v1/admin/users?page=&limit=` | —                                                     | 200 phân trang `UserResponse` (chỉ nhân viên) |
| POST   | `/api/v1/admin/users`              | `{ email, fullName, password, roles[] }`              | 201 `UserResponse`                            |
| PUT    | `/api/v1/admin/users/{id}/roles`   | `{ roles[] }` — danh sách đầy đủ, thay thế vai trò cũ | 200 `UserResponse`                            |

```json
{
  "email": "kho@sachluat.vn",
  "fullName": "Trần Thủ Kho",
  "password": "mat-khau-tam-thoi",
  "roles": ["warehouse_keeper"]
}
```

- `POST`: `roles` không rỗng, chỉ gồm vai trò nhân viên; mật khẩu 8–128 ký tự (mật khẩu tạm, nhân viên tự đổi qua `/auth/password/change`). Nhân viên mới phải bật 2FA ở lần đăng nhập đầu.
- `PUT roles`: nhận mọi vai trò kể cả `customer`; Super Admin không tự gỡ `super_admin` của mình được.
- Đổi vai trò có hiệu lực từ lần refresh token kế tiếp của người đó (tối đa 15 phút).

Lỗi: `EMAIL_TAKEN` (409), `USER_NOT_FOUND` (404), `CANNOT_REMOVE_OWN_ADMIN` (422), `VALIDATION_ERROR` (400, vai trò không hợp lệ).

## Admin — Catalog

Quyền: `super_admin`, `product_manager`. Mọi API sửa đầu sách, ấn bản, SKU đều trả lại **toàn bộ đầu sách** (`AdminBookResponse`), FE thay state màn chi tiết bằng response. `PUT` là **thay thế toàn bộ**: field danh sách bỏ trống (`categoryIds`, `authorIds`, `legalDocumentIds`) sẽ bị xóa hết.

| Method                            | Route                                           | Request                                                      | Response                                                                 |
| --------------------------------- | ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| GET                               | `/api/v1/admin/books?q=&status=&page=&limit=`   | —                                                            | Phân trang `AdminBookSummaryResponse`, mới sửa trước                     |
| GET                               | `/api/v1/admin/books/{id}`                      | —                                                            | `AdminBookResponse`                                                      |
| POST                              | `/api/v1/admin/books`                           | `UpsertBookRequest`                                          | 201 `AdminBookResponse`                                                  |
| PUT                               | `/api/v1/admin/books/{id}`                      | `UpsertBookRequest`                                          | `AdminBookResponse`                                                      |
| POST                              | `/api/v1/admin/books/{id}/editions`             | `UpsertEditionRequest`                                       | 201 `AdminBookResponse`                                                  |
| PUT                               | `/api/v1/admin/editions/{id}`                   | `UpsertEditionRequest`                                       | `AdminBookResponse`                                                      |
| POST                              | `/api/v1/admin/editions/{id}/set-latest`        | —                                                            | `AdminBookResponse`                                                      |
| POST                              | `/api/v1/admin/editions/{id}/skus`              | `CreateSkuRequest`                                           | 201 `AdminBookResponse`                                                  |
| PUT                               | `/api/v1/admin/skus/{id}`                       | `{ listPrice, salePrice, allowPreorder }`                    | `AdminBookResponse`                                                      |
| GET                               | `/api/v1/admin/categories`                      | —                                                            | Mảng phẳng `CategoryResponse` (FE tự dựng cây theo `parentId`)           |
| POST / PUT `{id}` / DELETE `{id}` | `/api/v1/admin/categories`                      | `{ name, slug, parentId?, sortOrder }`                       | 201 / 200 `CategoryResponse` / 204                                       |
| GET                               | `/api/v1/admin/authors?q=&page=&limit=`         | —                                                            | Phân trang `AuthorResponse`                                              |
| POST / PUT `{id}` / DELETE `{id}` | `/api/v1/admin/authors`                         | `{ name, slug, biography?, sortOrder }`                      | 201 / 200 `AuthorResponse` / 204                                         |
| GET                               | `/api/v1/admin/legal-documents?q=&page=&limit=` | —                                                            | Phân trang `LegalDocumentResponse` (`q` tìm theo số hiệu hoặc trích yếu) |
| POST / PUT `{id}` / DELETE `{id}` | `/api/v1/admin/legal-documents`                 | `{ docNumber, docType, title, issuedDate?, effectiveDate? }` | 201 / 200 `LegalDocumentResponse` / 204                                  |

`q` của `/admin/books` khớp tên chứa chuỗi, đúng slug hoặc đúng ISBN; `status` = `draft`, `active`, `hidden`. Xóa danh mục/tác giả/văn bản là **xóa mềm** (ẩn khỏi mọi danh sách, slug dùng lại được). Đầu sách, ấn bản, SKU không có API xóa: ẩn bằng trạng thái `hidden` / `discontinued`.

### UpsertBookRequest

| Field                             | Kiểu               | Ràng buộc                                                                       |
| --------------------------------- | ------------------ | ------------------------------------------------------------------------------- |
| `title`                           | string             | bắt buộc, ≤ 255                                                                 |
| `slug`                            | string             | chữ thường không dấu, số, gạch nối đơn (`bo-luat-dan-su-2026`), ≤ 255, duy nhất |
| `bookType`                        | enum `BookType`    | bắt buộc                                                                        |
| `status`                          | enum `BookStatus`  | bắt buộc; chỉ `active` mới hiện trên website                                    |
| `description?`                    | string             | HTML mô tả                                                                      |
| `targetAudiences?`                | `TargetAudience[]` | tự bỏ trùng                                                                     |
| `metaTitle?` / `metaDescription?` | string             | ≤ 255 / ≤ 500 (SEO)                                                             |
| `categoryIds?` / `authorIds?`     | `long[]`           | id phải tồn tại, nếu không → `REFERENCE_NOT_FOUND`                              |

### UpsertEditionRequest

| Field                                | Kiểu                 | Ràng buộc                                                                                                                      |
| ------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `isbn`                               | string               | ISBN-13: 13 số (cho phép gạch nối/khoảng trắng), bắt đầu `978`/`979`, đúng số kiểm tra; duy nhất toàn hệ thống; lưu dạng 13 số |
| `publisher`                          | string               | bắt buộc, ≤ 255                                                                                                                |
| `publishingDecisionNo`               | string               | bắt buộc, ≤ 100 (số QĐXB, BR-04)                                                                                               |
| `status`                             | enum `EditionStatus` | bắt buộc; mua được khi `on_sale` hoặc `clearance`                                                                              |
| `registrationNo?` / `editionName?`   | string               | ≤ 100 / ≤ 100                                                                                                                  |
| `publishYear?`                       | số                   | 1900–2100                                                                                                                      |
| `updatedToText?` / `updatedToDate?`  | string / DateOnly    | nhãn “Cập nhật đến”, ≤ 500                                                                                                     |
| `pages?` / `weightGram?`             | số                   | > 0                                                                                                                            |
| `size?`                              | string               | ≤ 50, ví dụ `16x24 cm`                                                                                                         |
| `coverImageUrl?` / `previewFileUrl?` | string               | URL ≤ 500 (chưa có API upload, FE dán URL)                                                                                     |
| `tableOfContents?`                   | string               | mục lục                                                                                                                        |
| `releaseDate?`                       | DateOnly             | ngày phát hành / dự kiến                                                                                                       |
| `legalDocumentIds?`                  | `long[]`             | văn bản được cập nhật trong ấn bản                                                                                             |

Ấn bản đầu tiên của đầu sách **tự thành ấn bản mới nhất**; các lần sau dùng `set-latest` (mỗi đầu sách đúng một ấn bản mới nhất, BR-02).

### CreateSkuRequest và giá

| Field           | Kiểu             | Ràng buộc                                                                  |
| --------------- | ---------------- | -------------------------------------------------------------------------- |
| `skuCode`       | string           | chữ, số, gạch nối, ≤ 50, tự chuyển chữ hoa (`SLVN-BLDS-2026-BM`), duy nhất |
| `coverType`     | enum `CoverType` | mỗi ấn bản tối đa 1 SKU mỗi loại bìa                                       |
| `listPrice`     | decimal          | giá bìa, số nguyên > 0                                                     |
| `salePrice`     | decimal          | giá bán, số nguyên > 0, ≤ `listPrice`                                      |
| `allowPreorder` | boolean          | lưu cờ, chưa dùng trong đặt hàng                                           |

### Response

```json
// AdminBookSummaryResponse
{ "id": 1, "title": "Bộ luật Dân sự 2026", "slug": "bo-luat-dan-su-2026", "bookType": "code", "status": "active", "editionCount": 2, "updatedAt": "2026-10-23T03:00:00Z" }

// AdminBookResponse = các field của chi tiết sách website + status, createdAt, updatedAt;
// editions gồm MỌI trạng thái (kể cả draft), mỗi SKU có inStock
{ "id": 1, "title": "...", "slug": "...", "description": null, "bookType": "code", "status": "active",
  "targetAudiences": ["lawyer"], "metaTitle": null, "metaDescription": null,
  "categories": [{ "id": 3, "name": "Dân sự", "slug": "dan-su" }], "authors": [],
  "editions": [ /* EditionResponse như mục Catalog (website) */ ],
  "createdAt": "2026-10-23T03:00:00Z", "updatedAt": "2026-10-23T03:05:00Z" }

// CategoryResponse
{ "id": 3, "name": "Dân sự", "slug": "dan-su", "parentId": null, "sortOrder": 1 }

// AuthorResponse
{ "id": 2, "name": "Ban biên tập", "slug": "ban-bien-tap", "biography": null, "sortOrder": 1 }

// LegalDocumentResponse
{ "id": 5, "docNumber": "91/2015/QH13", "docType": "code", "title": "Bộ luật Dân sự", "issuedDate": "2015-11-24", "effectiveDate": "2017-01-01" }
```

### Lỗi

| HTTP | `code`                                       | Khi nào                                                                                                                                                |
| ---- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 409  | `SLUG_DUPLICATE`                             | Slug đầu sách/danh mục/tác giả đã dùng                                                                                                                 |
| 409  | `ISBN_DUPLICATE`                             | ISBN đã có ở ấn bản khác                                                                                                                               |
| 409  | `SKU_CODE_DUPLICATE` / `SKU_COVER_DUPLICATE` | Mã SKU trùng / ấn bản đã có SKU loại bìa này                                                                                                           |
| 409  | `CATEGORY_HAS_CHILDREN`                      | Xóa danh mục còn danh mục con                                                                                                                          |
| 422  | `CATEGORY_PARENT_INVALID`                    | Chọn chính nó hoặc danh mục con cháu làm cha                                                                                                           |
| 422  | `REFERENCE_NOT_FOUND`                        | Id danh mục / tác giả / văn bản / danh mục cha không tồn tại                                                                                           |
| 404  | `NOT_FOUND` / `EDITION_NOT_FOUND`            | Không tìm thấy đầu sách, ấn bản, SKU, danh mục...                                                                                                      |
| 400  | `VALIDATION_ERROR`                           | Sai định dạng (ISBN, slug, giá, độ dài...) — kiểm tra trước nên thường gặp thay vì `ISBN_INVALID`, `SLUG_INVALID`, `PRICE_INVALID`, `SKU_CODE_INVALID` |

## Admin — Kho

Quyền: `super_admin`, `warehouse_keeper`; riêng duyệt/từ chối phiếu nhập chỉ `super_admin`, và **người duyệt phải khác người lập phiếu**. Tồn chỉ tăng khi phiếu được duyệt (US-05).

| Method | Route                                                   | Request                                           | Response                                           |
| ------ | ------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| GET    | `/api/v1/admin/inventory/receipts?status=&page=&limit=` | `status`: `draft`, `approved`, `rejected`         | Phân trang `ReceiptResponse`, mới nhất trước       |
| GET    | `/api/v1/admin/inventory/receipts/{id}`                 | —                                                 | `ReceiptResponse`                                  |
| POST   | `/api/v1/admin/inventory/receipts`                      | `CreateReceiptRequest`                            | 201 `ReceiptResponse` (`draft`)                    |
| POST   | `/api/v1/admin/inventory/receipts/{id}/approve`         | —                                                 | `ReceiptResponse` (`approved`)                     |
| POST   | `/api/v1/admin/inventory/receipts/{id}/reject`          | `{ "reason": "Sai số lượng" }` (bắt buộc, ≤ 1000) | `ReceiptResponse` (`rejected`)                     |
| GET    | `/api/v1/admin/inventory/skus/{skuId}`                  | —                                                 | `StockCardResponse` (thẻ kho)                      |
| PUT    | `/api/v1/admin/inventory/skus/{skuId}/threshold`        | `{ "lowStockThreshold": 50 }` (0–100.000)         | `StockCardResponse`                                |
| GET    | `/api/v1/admin/inventory/low-stock?page=&limit=`        | —                                                 | Phân trang `LowStockResponse`, tồn thấp nhất trước |
| POST   | `/api/v1/admin/inventory/issues`                        | `IssueStockRequest`                               | `StockCardResponse`                                |

### Request

```json
// CreateReceiptRequest — một phiếu nhiều dòng, mỗi dòng là một lô in
{
  "note": "Nhập lô tháng 10",
  "lines": [
    { "skuId": 100, "batchCode": "LO-2026-10", "printerName": "Xưởng in A", "quantity": 500, "unitCost": 45000, "receivedAt": "2026-10-20" }
  ]
}

// IssueStockRequest — xuất thủ công theo FIFO
{ "skuId": 100, "quantity": 3, "type": "damage", "note": "Bìa rách khi vận chuyển" }
```

| Field                  | Ràng buộc                                               |
| ---------------------- | ------------------------------------------------------- |
| `lines`                | ít nhất 1 dòng; cùng SKU không trùng `batchCode`        |
| `lines[].skuId`        | SKU phải tồn tại trong Catalog                          |
| `lines[].batchCode`    | bắt buộc, ≤ 50, tự chuyển chữ hoa, chưa dùng cho SKU đó |
| `lines[].printerName?` | ≤ 255                                                   |
| `lines[].quantity`     | > 0                                                     |
| `lines[].unitCost`     | giá vốn/cuốn, số nguyên VNĐ ≥ 0                         |
| `lines[].receivedAt`   | DateOnly, quyết định thứ tự FIFO                        |
| `note?`                | ≤ 1000                                                  |
| Issue `type`           | `damage` (hủy hàng lỗi) hoặc `gift` (biếu tặng)         |
| Issue `note`           | bắt buộc, lý do xuất                                    |

### Response

```json
// ReceiptResponse
{
  "id": 7, "status": "approved", "note": "Nhập lô tháng 10",
  "createdBy": 4, "createdAt": "2026-10-23T03:00:00Z",
  "decidedBy": 1, "decidedAt": "2026-10-23T04:00:00Z", "rejectReason": null,
  "lines": [
    { "id": 11, "skuId": 100, "skuCode": "SLVN-BLDS-2026-BM", "batchCode": "LO-2026-10", "printerName": "Xưởng in A",
      "quantity": 500, "unitCost": 45000, "receivedAt": "2026-10-20", "printBatchId": 21 }
  ]
}

// StockCardResponse — thẻ kho của một SKU
{
  "skuId": 100, "skuCode": "SLVN-BLDS-2026-BM",
  "available": 495, "reserved": 5, "onHand": 500, "lowStockThreshold": 50,
  "batches": [
    { "id": 21, "batchCode": "LO-2026-10", "printerName": "Xưởng in A", "quantity": 500, "remaining": 500, "unitCost": 45000, "receivedAt": "2026-10-20" }
  ],
  "recentTransactions": [
    { "id": 31, "type": "import", "quantity": 500, "printBatchId": 21, "reference": "GR-7", "createdBy": 1, "note": null, "createdAt": "2026-10-23T04:00:00Z" }
  ]
}

// LowStockResponse
{ "skuId": 100, "skuCode": "SLVN-BLDS-2026-BM", "bookTitle": "Bộ luật Dân sự 2026", "available": 12, "reserved": 0, "lowStockThreshold": 50 }
```

- `available` = bán được; `reserved` = đang giữ cho đơn chưa đóng gói; `onHand` = `available + reserved` = tổng `remaining` các lô.
- `batches` xếp theo thứ tự xuất FIFO (cũ nhất trước). `recentTransactions` = 100 dòng thẻ kho gần nhất, mới nhất trước.
- `quantity` trong thẻ kho: dương là nhập, âm là xuất. `type`: `import`, `sale`, `return`, `adjust`, `damage`, `gift`.
- `reference`: `GR-{id}` (phiếu nhập), mã đơn `SLVN...` (bán/hoàn), `ISSUE-yyyyMMddHHmmss` (xuất thủ công).
- `createdBy`, `decidedBy` là user id; API chưa trả tên người dùng.
- SKU chưa từng nhập kho vẫn mở thẻ kho được (tồn 0, không có lô) nhưng **không** nằm trong `low-stock`.

### Lỗi

| HTTP | `code`                  | Khi nào                                      |
| ---- | ----------------------- | -------------------------------------------- |
| 403  | `RECEIPT_SELF_APPROVAL` | Người lập tự duyệt phiếu                     |
| 409  | `RECEIPT_NOT_DRAFT`     | Phiếu đã duyệt hoặc từ chối                  |
| 409  | `BATCH_CODE_DUPLICATE`  | Mã lô đã có cho SKU (khi lập hoặc lúc duyệt) |
| 422  | `RECEIPT_EMPTY`         | Phiếu không có dòng nào                      |
| 422  | `REFERENCE_NOT_FOUND`   | Có SKU không tồn tại                         |
| 409  | `OUT_OF_STOCK`          | Xuất thủ công vượt tồn khả dụng              |
| 404  | `NOT_FOUND`             | Không tìm thấy phiếu hoặc SKU                |

## Admin — Đơn hàng

Admin xem và đổi trạng thái đơn thủ công (chưa tích hợp vận chuyển/thanh toán). Nút đổi trạng thái trên FE nên dựng **từ `nextStatuses`** trong response: đó là danh sách duy nhất backend chấp nhận.

| Method | Route                                | Quyền           | Request                                                              | Response                                          |
| ------ | ------------------------------------ | --------------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| GET    | `/api/v1/admin/orders`               | `orders_read`   | query bên dưới                                                       | Phân trang `OrderSummaryResponse`, mới nhất trước |
| GET    | `/api/v1/admin/orders/{code}`        | `orders_read`   | —                                                                    | `AdminOrderResponse`                              |
| POST   | `/api/v1/admin/orders/{code}/status` | `orders_manage` | `{ "status": "packing", "note": "Đã gọi xác nhận" }` (`note` ≤ 1000) | `AdminOrderResponse`                              |

| Query param     | Kiểu            | Ý nghĩa                                                        |
| --------------- | --------------- | -------------------------------------------------------------- |
| `status`        | `OrderStatus`   | ví dụ `pending_confirm`                                        |
| `paymentMethod` | `PaymentMethod` | `cod`, `bank_transfer`, ...                                    |
| `from`, `to`    | DateOnly        | ngày tạo theo **giờ Việt Nam**, tính cả hai đầu; `to` ≥ `from` |
| `q`             | string ≤ 50     | **đúng** mã đơn hoặc **đúng** số điện thoại                    |
| `page`, `limit` | số              | như quy ước chung                                              |

```json
// AdminOrderResponse
{
  "order": {/* OrderResponse như mục Đặt hàng, có history */},
  "userId": 12,
  "nextStatuses": ["packing", "cancelled"],
  "costOfGoods": null
}
```

`userId` = `null` với khách vãng lai. `costOfGoods` = tổng giá vốn theo lô đã xuất (có từ khi `packing`), dùng tính lợi nhuận gộp; khách không thấy field này.

&#91;embedded content: trạng thái đơn hàng · 15 trạng thái theo mục 16.1\]

Chuyển trạng thái sai bảng trả 409 `ORDER_INVALID_TRANSITION`. Tác động đi kèm mỗi lần chuyển:

| Chuyển sang           | Tác động                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| `paid`                | `paymentStatus = paid` (đối soát chuyển khoản thủ công)                                           |
| `packing`             | Trừ tồn thật theo FIFO lô in, ghi giá vốn từng dòng                                               |
| `cancelled`           | Hoàn tồn tạm giữ                                                                                  |
| `delivered` (đơn COD) | `paymentStatus = paid`                                                                            |
| `returned`            | Nhập lại kho đúng các lô đã xuất                                                                  |
| `refunded`            | Chỉ khi `paymentStatus = paid`, sau đó `paymentStatus = refunded`; ngược lại 422 `ORDER_NOT_PAID` |

Đơn `pending_payment` quá 30 phút hệ thống tự chuyển `cancelled` (ghi chú “Tự động hủy do quá hạn thanh toán”, người đổi = `null`). Đơn đã `paid` không hủy được theo bảng 16.1.

## Bảng enum

Mọi enum gửi và nhận dạng chuỗi snake\_case đúng như cột Giá trị; cột Hiển thị là gợi ý nhãn tiếng Việt (FE tự map).

| Enum                        | Giá trị                                                                                                                                                                                                                             | Hiển thị gợi ý                                                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BookType`                  | `code` · `consolidated` · `commentary` · `qna` · `textbook` · `monograph`                                                                                                                                                           | Bộ luật · Văn bản hợp nhất · Chú giải · Hỏi–đáp · Giáo trình · Sách chuyên khảo                                                                                                                                     |
| `BookStatus`                | `draft` · `active` · `hidden`                                                                                                                                                                                                       | Nháp · Đang hiển thị · Ẩn                                                                                                                                                                                           |
| `TargetAudience`            | `student` · `lawyer` · `business` · `citizen`                                                                                                                                                                                       | Sinh viên · Luật sư · Doanh nghiệp · Người dân                                                                                                                                                                      |
| `EditionStatus`             | `draft` · `upcoming` · `on_sale` · `discontinued` · `clearance`                                                                                                                                                                     | Nháp · Sắp phát hành · Đang bán · Ngừng bán · Thanh lý                                                                                                                                                              |
| `CoverType`                 | `paperback` · `hardcover`                                                                                                                                                                                                           | Bìa mềm · Bìa cứng                                                                                                                                                                                                  |
| `LegalDocumentType`         | `constitution` · `code` · `law` · `ordinance` · `resolution` · `decree` · `decision` · `circular` · `joint_circular` · `other`                                                                                                      | Hiến pháp · Bộ luật · Luật · Pháp lệnh · Nghị quyết · Nghị định · Quyết định · Thông tư · Thông tư liên tịch · Khác                                                                                                 |
| `Occupation`                | `student` · `lawyer` · `accountant` · `other`                                                                                                                                                                                       | Sinh viên · Luật sư · Kế toán · Khác                                                                                                                                                                                |
| Role                        | `super_admin` · `product_manager` · `order_manager` · `warehouse_keeper` · `customer_service` · `marketing` · `accountant` · `customer`                                                                                             | Super Admin · Quản lý sản phẩm · Quản lý đơn · Thủ kho · CSKH · Marketing · Kế toán · Khách hàng                                                                                                                    |
| `OrderStatus`               | `pending_payment` · `pending_confirm` · `preorder_waiting` · `paid` · `confirmed` · `packing` · `ready_to_ship` · `shipping` · `delivered` · `completed` · `return_requested` · `returning` · `returned` · `refunded` · `cancelled` | Chờ thanh toán · Chờ xác nhận · Chờ phát hành · Đã thanh toán · Chờ xử lý · Đang đóng gói · Chờ lấy hàng · Đang giao · Đã giao · Hoàn tất · Yêu cầu đổi trả · Đang hoàn hàng · Đã hoàn hàng · Đã hoàn tiền · Đã hủy |
| `PaymentMethod`             | `cod` · `bank_transfer` · `vnpay` · `momo` · `zalopay`                                                                                                                                                                              | COD · Chuyển khoản · VNPAY · MoMo · ZaloPay (3 cổng cuối chưa hỗ trợ)                                                                                                                                               |
| `PaymentStatus`             | `unpaid` · `paid` · `refunded` · `partial_refund`                                                                                                                                                                                   | Chưa thanh toán · Đã thanh toán · Đã hoàn tiền · Hoàn một phần                                                                                                                                                      |
| `ReceiptStatus`             | `draft` · `approved` · `rejected`                                                                                                                                                                                                   | Chờ duyệt · Đã duyệt · Từ chối                                                                                                                                                                                      |
| `TransactionType` (thẻ kho) | `import` · `sale` · `return` · `adjust` · `damage` · `gift`                                                                                                                                                                         | Nhập kho · Bán · Hoàn về · Điều chỉnh · Hủy hàng lỗi · Biếu tặng                                                                                                                                                    |
| `IssueType`                 | `damage` · `gift`                                                                                                                                                                                                                   | Hủy hàng lỗi · Biếu tặng                                                                                                                                                                                            |

## Bảng mã lỗi

FE rẽ nhánh theo `code` (ổn định), không theo `title` (có thể đổi câu chữ). Lỗi nghiệp vụ có `title` tiếng Việt hiển thị được cho khách; lỗi chung (nhóm đầu) nên dùng câu chữ của FE.

| `code`                                     | HTTP      | Nhóm          | FE xử lý                                                                              |
| ------------------------------------------ | --------- | ------------- | ------------------------------------------------------------------------------------- |
| `VALIDATION_ERROR`                         | 400       | Chung         | Hiển thị lỗi theo từng field trong `errors`                                           |
| `UNAUTHORIZED`                             | 401       | Chung         | Thử `/auth/refresh` một lần, thất bại thì về màn đăng nhập                            |
| `FORBIDDEN`                                | 403       | Chung         | Không đủ quyền hoặc nhân viên chưa bật 2FA → màn bật 2FA nếu `requiresTwoFactorSetup` |
| `NOT_FOUND`                                | 404       | Chung         | Trang 404 / thông báo không tìm thấy                                                  |
| `METHOD_NOT_ALLOWED`                       | 405       | Chung         | Lỗi tích hợp (sai method)                                                             |
| `CONFLICT`                                 | 409       | Chung         | Hiển thị `title`                                                                      |
| `TOO_MANY_REQUESTS`                        | 429       | Chung         | Báo “thao tác quá nhanh”, chờ rồi thử lại                                             |
| `INTERNAL_ERROR`                           | 500       | Chung         | Thông báo chung, hiển thị `traceId` để khách báo CSKH                                 |
| `INVALID_CREDENTIALS`                      | 401       | Auth          | Sai email/mật khẩu; **không** gọi refresh                                             |
| `ACCOUNT_LOCKED`                           | 423       | Auth          | Khóa 15 phút                                                                          |
| `EMAIL_TAKEN`                              | 409       | Auth          | Gợi ý đăng nhập                                                                       |
| `INVALID_REFRESH_TOKEN`                    | 401       | Auth          | Xóa phiên, về màn đăng nhập                                                           |
| `TWO_FACTOR_TOKEN_INVALID`                 | 401       | Auth          | Quay lại bước nhập mật khẩu                                                           |
| `OTP_INVALID`                              | 400       | Auth          | Mã 6 số sai, cho nhập lại                                                             |
| `TWO_FACTOR_ALREADY_ENABLED`               | 409       | Auth          | Đã bật 2FA                                                                            |
| `USER_NOT_FOUND`                           | 404       | Auth          | —                                                                                     |
| `ROLE_INVALID` / `CANNOT_REMOVE_OWN_ADMIN` | 422       | Auth          | Hiển thị `title`                                                                      |
| `IDENTITY_ERROR`                           | 422       | Auth          | Lỗi Identity hiếm gặp, hiển thị `title`                                               |
| `SLUG_DUPLICATE` / `SLUG_INVALID`          | 409 / 422 | Catalog       | Báo ở field `slug`                                                                    |
| `ISBN_DUPLICATE` / `ISBN_INVALID`          | 409 / 422 | Catalog       | Báo ở field `isbn`                                                                    |
| `SKU_CODE_DUPLICATE` / `SKU_CODE_INVALID`  | 409 / 422 | Catalog       | Báo ở field `skuCode`                                                                 |
| `SKU_COVER_DUPLICATE`                      | 409       | Catalog       | Ấn bản đã có SKU loại bìa này                                                         |
| `PRICE_INVALID`                            | 422       | Catalog       | Báo ở field giá                                                                       |
| `EDITION_NOT_FOUND`                        | 404       | Catalog       | —                                                                                     |
| `CATEGORY_PARENT_INVALID`                  | 422       | Catalog       | Danh mục cha không hợp lệ                                                             |
| `CATEGORY_HAS_CHILDREN`                    | 409       | Catalog       | Chuyển/xóa danh mục con trước                                                         |
| `REFERENCE_NOT_FOUND`                      | 422       | Catalog, Kho  | Tải lại danh sách chọn (id đã bị xóa)                                                 |
| `OUT_OF_STOCK`                             | 409       | Kho, Giỏ, Đơn | Báo hết hàng, tải lại giỏ                                                             |
| `RECEIPT_NOT_DRAFT`                        | 409       | Kho           | Tải lại phiếu                                                                         |
| `RECEIPT_SELF_APPROVAL`                    | 403       | Kho           | Cần người khác duyệt                                                                  |
| `BATCH_CODE_DUPLICATE`                     | 409       | Kho           | Báo ở dòng có mã lô trùng                                                             |
| `RECEIPT_EMPTY`                            | 422       | Kho           | Thêm dòng                                                                             |
| `MAX_QTY_EXCEEDED`                         | 422       | Giỏ, Đơn      | > 20 cuốn/SKU → gợi ý báo giá sỉ                                                      |
| `SKU_NOT_AVAILABLE`                        | 422       | Giỏ, Đơn      | Sách ngừng bán, xóa khỏi giỏ                                                          |
| `CART_FULL`                                | 422       | Giỏ           | Đã 50 loại sách                                                                       |
| `CART_EMPTY`                               | 422       | Đơn           | Về trang giỏ                                                                          |
| `PAYMENT_METHOD_NOT_SUPPORTED`             | 422       | Đơn           | Chỉ cho chọn COD / chuyển khoản                                                       |
| `IDEMPOTENCY_KEY_REUSED`                   | 409       | Đơn           | Sinh key mới rồi gửi lại                                                              |
| `ORDER_NOT_CANCELLABLE`                    | 422       | Đơn           | Ẩn nút hủy, hướng dẫn liên hệ CSKH                                                    |
| `ORDER_INVALID_TRANSITION`                 | 409       | Admin đơn     | Tải lại đơn (người khác vừa đổi), dựng lại nút từ `nextStatuses`                      |
| `ORDER_NOT_PAID`                           | 422       | Admin đơn     | Không hoàn tiền đơn chưa thanh toán                                                   |

## Luồng gợi ý và việc chưa có

### Luồng mua hàng (website)

1. Trang chủ / danh mục: `GET /api/v1/categories` (menu) + `GET /api/v1/books?category=<slug>&page=1`.
2. Chi tiết: `GET /api/v1/books/{slug}`; chọn ấn bản và loại bìa ngay trên dữ liệu đã tải.
3. Thêm giỏ: `POST /api/v1/cart/items` (hỏi xác nhận trước nếu chọn ấn bản cũ).
4. Giỏ: `GET /api/v1/cart` + `POST /api/v1/shipping/quote` với `subtotal`.
5. Thanh toán: sinh `Idempotency-Key` khi vào trang, `POST /api/v1/orders`.
6. Trang cảm ơn hiển thị `orderCode`; khách vãng lai tra cứu lại bằng `POST /api/v1/orders/lookup`, thành viên dùng `GET /api/v1/orders`.

Sau khi đăng nhập: gọi `GET /api/v1/cart` (gộp giỏ khách) và `GET /api/v1/me`. Khi mở lại trang: gọi `POST /api/v1/auth/refresh` để lấy access token từ cookie; 401 = chưa đăng nhập.

### Refresh token một luồng (gợi ý)

```ts
let refreshing: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  // Mọi request 401 cùng lúc chờ chung một lần refresh: refresh song song sẽ bị backend coi là dùng lại token.
  refreshing ??= fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include" })
    .then(async (res) => (res.ok ? ((await res.json()).accessToken as string) : null))
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401 && retry && !path.startsWith("/api/v1/auth/")) {
    accessToken = await refreshToken();
    if (accessToken) return api(path, init, false);
    redirectToLogin();
  }
  return res;
}
```

`accessToken` và `redirectToLogin` là state/hàm của app. Không tự refresh với các route `/auth/*` (401 ở đó là sai mật khẩu, hết phiên 2FA...).

### Luồng Admin

1. Đăng nhập; nếu `requiresTwoFactor` → nhập mã 6 số; nếu `user.requiresTwoFactorSetup` → màn bật 2FA (QR).
2. Hiện menu theo `user.roles` (bảng quyền ở mục Admin — người dùng).
3. Nhập sách: tạo danh mục/tác giả/văn bản → tạo đầu sách → thêm ấn bản → thêm SKU → đặt đầu sách `active`, ấn bản `on_sale`.
4. Nhập kho: thủ kho lập phiếu → Super Admin duyệt → sách có `inStock = true` trên website.
5. Xử lý đơn: danh sách `status=pending_confirm` → `confirmed` → `packing` → `ready_to_ship` → `shipping` → `delivered`.

### Chưa có trong API (giai đoạn 1)

| Hạng mục                                                                      | Hiện trạng                              | FE tạm làm gì                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| CORS                                                                          | Chưa cấu hình                           | Proxy `/api/v1` qua Next.js `rewrites`                                       |
| Cổng thanh toán VNPAY/MoMo/ZaloPay/VietQR                                     | Chưa có                                 | Chỉ hiện COD và chuyển khoản; thông tin tài khoản nhận tiền là nội dung tĩnh |
| Phí ship theo đơn vị vận chuyển, thời gian giao dự kiến                       | Phí cố định                             | Dùng `/shipping/quote`                                                       |
| Mã giảm giá, combo, giá sỉ                                                    | Chưa có                                 | Ẩn ô nhập mã                                                                 |
| Đặt trước (pre-order)                                                         | Chưa có                                 | Ấn bản `upcoming` chỉ hiển thị                                               |
| Tìm kiếm không dấu, theo tác giả, gợi ý khi gõ (`/search`)                    | Chỉ có `q` theo tên/ISBN, phân biệt dấu | Dùng `GET /books?q=`                                                         |
| Lọc còn hàng / đang giảm giá, sắp bán chạy / đánh giá cao                     | Chưa có                                 | Ẩn các lựa chọn này                                                          |
| Xác thực email/OTP, quên mật khẩu, đăng nhập mạng xã hội                      | Chưa có                                 | Ẩn link “Quên mật khẩu”                                                      |
| Sổ địa chỉ, yêu thích, đánh giá, đăng ký nhận tin ấn bản mới                  | Chưa có                                 | Nhập địa chỉ mỗi lần đặt                                                     |
| Yêu cầu đổi trả phía khách, hóa đơn điện tử                                   | Chưa có                                 | Hướng dẫn liên hệ CSKH                                                       |
| Upload ảnh bìa / file đọc thử                                                 | Chỉ lưu URL                             | Dán URL đã upload nơi khác                                                   |
| Nội dung (bài viết, banner, trang tĩnh), dashboard, báo cáo, nhật ký thao tác | Chưa có                                 | —                                                                            |
| Tên người thao tác trong thẻ kho / phiếu nhập                                 | Chỉ có user id                          | Hiển thị id                                                                  |

Lỗi đã biết: `sort=newest` hiện để sách **chưa có `releaseDate`** lên đầu danh sách (PostgreSQL xếp `NULL` trước khi sắp giảm dần); backend sẽ sửa. Admin nên nhập `releaseDate` cho mọi ấn bản.
