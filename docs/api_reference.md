# Sách Luật Việt Nam — API Reference cho Frontend

Oct 23, 2026 · @Software DGP

## Tổng quan

Mọi API nằm dưới tiền tố `/api/v1`, trả JSON (camelCase), lỗi theo một format duy nhất (Problem Details, mục Quy ước chung). Tài liệu này viết theo code backend ngày 23/10/2026, đối chiếu lại với code backend trên `main` ngày 26/10/2026 (commit `a122eb0`); nguồn chuẩn để tra nhanh là OpenAPI. Chi tiết thanh toán, khuyến mãi, phí vận chuyển ở `docs/features/checkout-promotion-shipping.md`.

| Môi trường      | Base URL                                   | Ghi chú                                            |
| --------------- | ------------------------------------------ | -------------------------------------------------- |
| Local (HTTP)    | `http://localhost:5279`                    | `dotnet run --project src/SachLuat.Api`            |
| Local (HTTPS)   | `https://localhost:7265`                   | profile `https`, nên dùng khi test cookie `Secure` |
| Deploy (Render) | `https://sachphapluatvietnam.onrender.com` | Biến `API_BASE_URL` của FE, xem ghi chú dưới       |
| Production      | Chưa có                                    | Chưa deploy                                        |

- **Bản deploy trên Render** (kiểm tra 23/10/2026): request đầu sau một lúc không dùng mất khoảng 20 giây (instance ngủ
  rồi khởi động lại). `/health/live` trả 200, `/health/ready` trả 503 trong khi API catalog vẫn trả 200 với dữ liệu
  rỗng. Không có `/openapi/v1.json` (chỉ bật ở Development), nên sinh type từ OpenAPI của backend chạy local.
  Response không có header CORS (lúc đó backend chưa cấu hình CORS).
- **OpenAPI JSON**: `/openapi/v1.json` · **API reference (Scalar)**: `/scalar` — chỉ bật ở Development. OpenAPI hiện mô tả enum là `integer` dù API nhận/trả chuỗi snake\_case (mục Enum).
- **Health**: `GET /health/live` (tiến trình sống), `GET /health/ready` (CSDL + Redis sẵn sàng). Không có tiền tố `/api/v1`.
- **Cookie**: backend dùng 3 cookie HttpOnly (refresh token, thiết bị tin cậy 2FA, giỏ khách). Mọi request từ trình duyệt phải gửi kèm cookie: `fetch(url, { credentials: 'include' })` hoặc axios `withCredentials: true`.
- **CORS**: backend đã bật CORS theo danh sách `Cors:AllowedOrigins` (có `AllowCredentials`; `appsettings.json` gồm 2 domain Vercel và `localhost:3000/3001`). Dù vậy refresh cookie là `SameSite=Strict`, nên FE vẫn gọi từ trình duyệt qua proxy cùng origin (`/api/v1/*` → backend, xem `docs/deploy-vercel.md`); gọi thẳng khác site thì cookie `sl_refresh` không được gửi.
- Ký hiệu trong bảng: `?` sau tên field = không bắt buộc / có thể `null`; kiểu `decimal` = số VNĐ nguyên (không phần lẻ); `DateOnly` = `"2026-10-23"`; `DateTime` = ISO 8601 UTC (`"2026-10-23T03:00:00Z"`).

## Quy ước chung

FE cần nắm 6 quy ước dưới đây; mọi endpoint ở các mục sau đều theo đúng chúng.

### Xác thực

- Gửi access token trong header: `Authorization: Bearer <accessToken>`. Token sống **15 phút** (`expiresIn = 900` giây). Lưu trong bộ nhớ (state), không lưu `localStorage`.
- Refresh token nằm trong cookie HttpOnly `sl_refresh`, JS không đọc được. Khi API trả 401: gọi `POST /api/v1/auth/refresh` (kèm cookie) lấy token mới rồi gọi lại request; refresh cũng 401 (`INVALID_REFRESH_TOKEN`) thì chuyển về màn đăng nhập.
- Chỉ **một** request refresh chạy tại một thời điểm (dùng chung một promise): mỗi lần refresh, token cũ bị thu hồi; hai request refresh song song với cùng cookie sẽ bị coi là dùng lại token và **đăng xuất mọi phiên**.
- API Admin (`/api/v1/admin/...`) cần đúng vai trò **và** phiên đã qua 2FA; thiếu thì 403.
- Mỗi tài khoản chỉ đăng nhập **một nơi**: đăng nhập mới (login/2FA) kết thúc mọi phiên cũ ngay (access token cũ cũng bị 401 nhờ claim `sv` = `sessionVersion`), backend báo qua Pusher (`docs/features/session-realtime.md`).

### Cookie do backend đặt

| Cookie       | Nội dung                  | Path           | Thuộc tính                                                                          |
| ------------ | ------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| `sl_refresh` | Refresh token             | `/api/v1/auth` | HttpOnly, Secure, SameSite=Strict; 30 ngày nếu `rememberMe`, ngược lại cookie phiên |
| `sl_2fa_trust` | Thiết bị tin cậy 2FA    | `/api/v1/auth` | HttpOnly, Secure, SameSite=Strict; `Auth:TrustedDeviceDays` (mặc định 30 ngày), chỉ đặt khi `/auth/login/2fa` có `trustDevice = true` được chấp nhận |
| `sl_cart`    | Mã giỏ của khách vãng lai | `/api/v1`      | HttpOnly, Secure, SameSite=Lax; 30 ngày                                             |

FE không tự đọc/ghi các cookie này, chỉ cần `credentials: 'include'`.

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

- `POST /api/v1/orders` và `POST /api/v1/orders/buy-now` nhận header `Idempotency-Key` (không bắt buộc, tối đa 64 ký tự, dài hơn → 400 `VALIDATION_ERROR`). Tạo **một UUID cho mỗi lần vào trang thanh toán**, giữ nguyên khi retry hay khách bấm nhiều lần: backend trả lại đúng đơn đã tạo thay vì tạo đơn trùng.
- `/api/v1/auth/*`, `/api/v1/orders/lookup` và `/api/v1/orders/guest/*`: tối đa **10 request/phút/IP** (`RateLimiting:AuthPermitPerMinute`); `POST /api/v1/checkout/preview`: **60 request/phút/IP** (`RateLimiting:CheckoutPermitPerMinute`). Vượt → 429 `TOO_MANY_REQUESTS`.

## Auth và tài khoản

Khách đăng ký/đăng nhập bằng email + mật khẩu; nhân viên có thêm bước mã 6 số từ ứng dụng authenticator. Mọi endpoint `/auth/*` bị giới hạn 10 request/phút/IP.

| Method | Route                          | Xác thực | Request body                       | Response                                         |
| ------ | ------------------------------ | -------- | ---------------------------------- | ------------------------------------------------ |
| POST   | `/api/v1/auth/register`        | Không    | `RegisterRequest`                  | 201 `AuthResponse` + cookie                      |
| POST   | `/api/v1/auth/login`           | Không (gửi kèm cookie `sl_2fa_trust` nếu có) | `LoginRequest` | 200 `LoginResponse` (+ cookie nếu không cần 2FA hoặc thiết bị tin cậy) |
| POST   | `/api/v1/auth/login/2fa`       | Không    | `{ twoFactorToken, code, trustDevice? }` | 200 `AuthResponse` + cookie (+ `sl_2fa_trust` khi `trustDevice` được chấp nhận) |
| POST   | `/api/v1/auth/refresh`         | Cookie   | không có                           | 200 `AuthResponse` + cookie mới                  |
| POST   | `/api/v1/auth/logout`          | Cookie   | không có                           | 204, xóa cookie                                  |
| POST   | `/api/v1/auth/password/change` | Bearer   | `{ currentPassword, newPassword }` | 204, thu hồi mọi phiên và thiết bị tin cậy, xóa cookie `sl_refresh`, `sl_2fa_trust` |
| POST   | `/api/v1/auth/2fa/setup`       | Bearer   | không có                           | 200 `{ sharedKey, authenticatorUri }`            |
| POST   | `/api/v1/auth/2fa/enable`      | Bearer   | `{ code }`                         | 200 `AuthResponse` (phiên đã qua 2FA)            |
| GET    | `/api/v1/me`                   | Bearer   | —                                  | 200 `MeResponse`                                 |
| PATCH  | `/api/v1/me`                   | Bearer   | `UpdateProfileRequest`             | 200 `MeResponse`                                 |
| PUT    | `/api/v1/me/preferences`       | Bearer   | `{ theme: "dark" \| "light" }`     | 200 `{ theme }` (`docs/features/storefront-theme.md`) |
| POST / PUT / DELETE | `/api/v1/me/avatar/upload-signature`, `/api/v1/me/avatar` | Bearer | xem `docs/features/user-avatar.md` | chữ ký upload / `{ avatarUrl }` / 204 |
| GET / POST / PUT / DELETE | `/api/v1/me/addresses`, `/{id}`, `POST /{id}/default` | Bearer | `UpsertAddressRequest` | `AddressResponse[]` (cả sổ; POST 201, DELETE 204), xem `docs/features/storefront-account.md` |
| PUT / DELETE | `/api/v1/me/invoice-info` | Bearer | `{ companyName, taxCode, address, email }` | `InvoiceInfoResponse` / 204 |
| POST   | `/api/v1/realtime/auth`        | Bearer   | `{ socketId, channelName }`        | 200 `{ auth }` cho pusher-js; kênh người khác 403; chưa cấu hình Pusher 503 `REALTIME_UNAVAILABLE` |

### Request

| Kiểu                   | Field                            | Kiểu dữ liệu | Ràng buộc                                                                |
| ---------------------- | -------------------------------- | ------------ | ------------------------------------------------------------------------ |
| `RegisterRequest`      | `email`                          | string       | email hợp lệ, ≤ 256                                                      |
|                        | `password`                       | string       | 8–128 ký tự                                                              |
|                        | `fullName`                       | string       | bắt buộc, ≤ 255                                                          |
|                        | `phoneNumber?`                   | string       | `0xxxxxxxxx` hoặc `+84xxxxxxxxx` (9 số sau tiền tố)                      |
| `LoginRequest`         | `email`, `password`              | string       | bắt buộc                                                                 |
|                        | `rememberMe?`                    | boolean      | mặc định `false`; `true` = giữ đăng nhập 30 ngày, `false` = phiên 12 giờ |
|                        | `portal?`                        | enum         | `storefront` (mặc định) hoặc `admin`; Super Admin chỉ đăng nhập được với `admin` |
| 2FA                    | `twoFactorToken`                 | string       | lấy từ `LoginResponse`, hạn 5 phút                                       |
|                        | `code`                           | string       | đúng 6 chữ số                                                            |
|                        | `trustDevice?`                   | boolean      | mặc định `false`; `true` = nhớ thiết bị `Auth:TrustedDeviceDays` ngày (bỏ qua với Super Admin không nằm trong `Auth:TrustedDeviceSuperAdminEmails`) |
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
    "requiresTwoFactorSetup": false,
    "isActive": true,
    "theme": null,
    "avatarUrl": null
  },
  "loginVia": "portal",
  "impersonatorId": null,
  "sessionVersion": 3
}

// LoginResponse — tài khoản chưa bật 2FA
{ "requiresTwoFactor": false, "twoFactorToken": null, "session": { /* AuthResponse */ } }

// LoginResponse — tài khoản đã bật 2FA: gọi tiếp /auth/login/2fa
{ "requiresTwoFactor": true, "twoFactorToken": "eyJ...", "session": null }

// /auth/2fa/setup
{ "sharedKey": "JBSWY3DPEHPK3PXP...", "authenticatorUri": "otpauth://totp/Sach%20Luat%20Viet%20Nam:admin%40...?secret=...&issuer=...&digits=6" }
```

`UserResponse` có đúng các field của `user` ở trên. `MeResponse` (của `/me`) = các field đó + `defaultAddress` (`AddressResponse` hoặc `null`) + `invoiceInfo` (`InvoiceInfoResponse` hoặc `null`). `requiresTwoFactorSetup = true` nghĩa là tài khoản nhân viên chưa bật 2FA: FE đưa thẳng sang màn bật 2FA. `loginVia`, `impersonatorId` xem `docs/features/fast-login-super-admin.md`; `sessionVersion` xem `docs/features/session-realtime.md`.

### Luồng bật 2FA cho nhân viên

1. Đăng nhập bằng mật khẩu → nhận `session`, `user.requiresTwoFactorSetup = true`. Gọi API Admin lúc này sẽ bị 403.
2. `POST /auth/2fa/setup` → hiển thị QR từ `authenticatorUri` (kèm `sharedKey` để nhập tay).
3. Nhân viên quét QR, nhập mã 6 số → `POST /auth/2fa/enable` → thay access token bằng token mới trong response. Các phiên cũ bị thu hồi.
4. Từ lần sau: `/auth/login` trả `requiresTwoFactor = true` → hỏi mã 6 số → `/auth/login/2fa`. Thiết bị đã tin cậy (cookie `sl_2fa_trust` còn hạn) thì `/auth/login` cấp luôn phiên đã qua 2FA, không hỏi mã.

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
| 403  | `ACCOUNT_DISABLED`           | Tài khoản bị Super Admin vô hiệu hóa (kiểm tra sau mật khẩu)  |
| 403  | `SUPER_ADMIN_PORTAL_FORBIDDEN` | Super Admin đăng nhập với `portal = storefront`             |
| 404 / 422 | `ADDRESS_NOT_FOUND` / `ADDRESS_LIMIT_REACHED` | Sổ địa chỉ: không thấy địa chỉ (kể cả của người khác) / đã đủ 10 địa chỉ |
| 422 / 503 | `AVATAR_URL_INVALID` / `UPLOAD_NOT_CONFIGURED` | Avatar, xem `docs/features/user-avatar.md`     |
| 429  | `TOO_MANY_REQUESTS`          | Quá 10 request/phút                                           |

Chưa có: xác thực email/OTP SMS, quên mật khẩu (Super Admin đặt mật khẩu mới hộ), đăng nhập Google/Facebook/Zalo.

## Catalog (website)

Ba endpoint công khai, không cần đăng nhập. Chỉ trả đầu sách `active` có ấn bản mới nhất đã công bố (không còn `draft`).

### GET /api/v1/books — danh sách, lọc, sắp xếp

| Query param            | Kiểu             | Mặc định | Ý nghĩa                                                                                       |
| ---------------------- | ---------------- | -------- | --------------------------------------------------------------------------------------------- |
| `q`                    | string ≤ 200     | —        | Tên sách chứa chuỗi (không phân biệt hoa thường, **có phân biệt dấu**), hoặc đúng ISBN 13 số, hoặc đúng mã SKU (`skuCode`, không phân biệt hoa thường; một phần mã không khớp) |
| `category`             | slug             | —        | Danh mục, gồm cả danh mục con. Slug không tồn tại → danh sách rỗng                            |
| `type`                 | `BookType`       | —        | `code`, `consolidated`, `commentary`, `qna`, `textbook`, `monograph`                          |
| `audience`             | `TargetAudience` | —        | `student`, `lawyer`, `business`, `citizen`                                                    |
| `cover`                | `CoverType`      | —        | `paperback`, `hardcover` (theo SKU của ấn bản mới nhất)                                       |
| `minPrice`, `maxPrice` | số ≥ 0           | —        | Khoảng giá bán của ấn bản mới nhất; `maxPrice` ≥ `minPrice`                                   |
| `legalDocument`        | string ≤ 50      | —        | Số hiệu văn bản, ví dụ `91/2015/QH13` (encode `/` thành `%2F` nếu thư viện HTTP không tự làm); khớp văn bản gắn với ấn bản hoặc chuỗi trong nhãn "Cập nhật đến" |
| `onSale`               | boolean          | `false`  | `true`: chỉ sách có SKU (ấn bản mới nhất) đang bán thấp hơn giá bìa hoặc đang chạy lịch giá   |
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
      "skuCode": "SLVN-BLDS-2026-BM",
      "salePrice": 150000,
      "listPrice": 200000,
      "discountPercent": 25,
      "saleEndsAt": null,
      "inStock": true
    }
  ],
  "meta": { "page": 1, "limit": 24, "total": 1 }
}
```

- Giá là SKU **rẻ nhất** (theo giá hiện hành) của ấn bản mới nhất, `skuCode` là mã của đúng SKU đó; `skuCode`, `salePrice`, `listPrice`, `discountPercent`, `saleEndsAt` = `null` khi ấn bản chưa có SKU.
- `salePrice` là **giá hiện hành** (đã áp lịch giá của Admin nếu đang chạy); `saleEndsAt` = thời điểm hết giá lịch (UTC), `null` khi đang bán giá thường. Lọc `minPrice`/`maxPrice` và sắp xếp theo giá cũng dùng giá hiện hành.
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
          "regularSalePrice": 150000,
          "discountPercent": 25,
          "saleEndsAt": null,
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
- Giá SKU: `salePrice` = giá khách trả lúc này (đã áp lịch giá), `regularSalePrice` = giá bán thường, `saleEndsAt` = hết giá lịch (UTC, `null` khi không có lịch đang chạy); `discountPercent` tính trên `salePrice` so với `listPrice`.

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

Giỏ **không** lưu mã giảm giá và không có `/cart/apply-coupon`: FE giữ mã, gửi kèm `POST /api/v1/checkout/preview` và khi tạo đơn (`docs/features/checkout-promotion-shipping.md`).

## Đặt hàng và đơn của khách

Đơn được tạo từ **giỏ hiện tại** (không gửi danh sách sách trong body) hoặc "Mua ngay" một SKU (giỏ giữ nguyên), đăng nhập là tùy chọn. Giai đoạn này chỉ có COD và chuyển khoản. Xem trước tiền, mã giảm giá, phí ship theo tỉnh: `docs/features/checkout-promotion-shipping.md`.

| Method | Route                          | Xác thực | Request                                                    | Response                                                        |
| ------ | ------------------------------ | -------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| POST   | `/api/v1/orders`               | Tùy chọn | `CreateOrderRequest` + header `Idempotency-Key`            | 201 `OrderResponse`                                             |
| POST   | `/api/v1/orders/buy-now`       | Tùy chọn | `{ skuId, quantity, ...CreateOrderRequest }` + header `Idempotency-Key` | 201 `OrderResponse` (giỏ giữ nguyên, `docs/features/storefront-buy-now.md`) |
| POST   | `/api/v1/checkout/preview`     | Tùy chọn | `{ source: cart \| buy_now, skuId?, quantity?, province?, couponCode?, phone? }` | 200 `CheckoutPreviewResponse` (60 request/phút/IP) |
| GET    | `/api/v1/orders?page=&limit=`  | Bearer   | —                                                          | 200 phân trang `OrderSummaryResponse` (mới nhất trước)          |
| GET    | `/api/v1/orders/{code}`        | Bearer   | —                                                          | 200 `OrderResponse` (chỉ đơn của mình, khác → 404)              |
| POST   | `/api/v1/orders/lookup`        | Không    | `{ "orderCode": "SLVN2610230001", "phone": "0901234567" }` | 200 `OrderResponse` (10 request/phút/IP)                        |
| POST   | `/api/v1/orders/{code}/cancel` | Bearer   | `{ "reason": "Đặt nhầm" }` (tùy chọn, ≤ 1000)              | 200 `OrderResponse`                                             |
| GET    | `/api/v1/orders/guest/{token}` | Không    | —                                                          | 200 `OrderResponse` của khách vãng lai (10 request/phút/IP)     |
| POST   | `/api/v1/orders/guest/{token}/cancel` | Không | `{ "reason": "..." }` (tùy chọn, ≤ 1000)               | 200 `OrderResponse` (10 request/phút/IP)                        |
| POST   | `/api/v1/shipping/quote`       | Không    | `{ subtotal, province?, items?: [{ skuId, quantity }] }`   | 200 `{ shippingFee, freeShippingThreshold, amountToFreeShipping, eta, zoneName }` |

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
| `couponCode?`                   | string | ≤ 40, không phân biệt hoa thường                                                         |
| `expectedTotal?`                | number | `total` của lần xem trước; khác tổng tính lại → 409 `CHECKOUT_TOTAL_CHANGED`             |

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
      "lineTotal": 750000,
      "discountAmount": 0
    }
  ],
  "subtotal": 750000,
  "discount": 0,
  "shippingFee": 0,
  "shippingDiscount": 0,
  "total": 750000,
  "appliedPromotions": [],
  "invoiceRequired": false,
  "invoiceInfo": null,
  "note": "Giao giờ hành chính",
  "paymentExpiresAt": null,
  "canCancel": true,
  "createdAt": "2026-10-23T03:00:00Z",
  "history": [{ "fromStatus": null, "toStatus": "pending_confirm", "note": null, "createdAt": "2026-10-23T03:00:00Z" }],
  "guestAccessToken": null
}
```

- `total = subtotal − discount + shippingFee − shippingDiscount`; phí ship khách thực trả là `shippingFee − shippingDiscount`. `appliedPromotions[]`: `{ promotionId, name, kind, couponCode, amount }`.
- `guestAccessToken`: chỉ có giá trị trong response tạo đơn (`POST /orders`, `POST /orders/buy-now`, kể cả gửi lại cùng `Idempotency-Key`) của **khách vãng lai**; mọi response khác là `null`. FE dựng link xem/hủy đơn từ token này (`/orders/guest/{token}`).

`OrderSummaryResponse` (danh sách đơn): `orderCode, status, paymentMethod, paymentStatus, customerName, phone, itemCount` (tổng số cuốn)`, total, createdAt`.

### Quy tắc FE cần biết

- Thành công → backend **xóa giỏ** (riêng `buy-now` không đụng giỏ); FE xóa state giỏ và chuyển trang cảm ơn với `orderCode`.
- Phí ship do Admin cấu hình (module Shipping): theo vùng tỉnh/thành và trọng lượng khi có `province` và đã có vùng giao hàng, không thì phí cố định `flatFee` (mặc định 30.000đ); **miễn phí khi tạm tính (trước giảm giá) ≥ `freeShippingThreshold`** (mặc định 300.000đ, `null` = tắt, BR-14). Tỉnh ngoài mọi vùng đang bật → 422 `ADDRESS_NOT_SUPPORTED`. Trang thanh toán dùng `POST /checkout/preview`; con số chốt là response tạo đơn.
- COD → `pending_confirm`. Chuyển khoản → `pending_payment` với `paymentExpiresAt` = tạo đơn + 30 phút; quá hạn chưa đối soát được thì hệ thống **tự hủy** (FE hiển thị đồng hồ đếm ngược). Số tài khoản và nội dung chuyển khoản chưa có API: FE hiển thị nội dung tĩnh, ghi rõ nội dung = `orderCode`.
- **Chống bom hàng COD** theo số điện thoại (đã chuẩn hóa `+84…` → `0…`): đủ `Ordering:MaxOpenCodOrdersPerPhone` (mặc định 3) đơn COD đang mở → `TOO_MANY_OPEN_ORDERS`; đủ `Ordering:CodFailedDeliveryLimit` (mặc định 2) đơn COD giao thất bại → `COD_NOT_ALLOWED`. Chuyển khoản luôn đặt được; preview có `phone` thì trả `codAllowed` để FE ẩn COD trước.
- Nút “Hủy đơn” hiện theo `canCancel` (BR-12: trạng thái còn chuyển được sang `cancelled`: `pending_payment`, `pending_confirm`, `preorder_waiting`, `confirmed`). Khách vãng lai tự hủy qua link `POST /orders/guest/{token}/cancel`; tra cứu bằng mã đơn + SĐT không trả token nên không hủy được từ đó.
- Đơn của thành viên gắn với tài khoản đang đăng nhập lúc đặt; đơn đặt khi chưa đăng nhập xem bằng link `guestAccessToken` hoặc tra cứu `/orders/lookup` (`phone` dạng `0…` hay `+84…` đều khớp).
- `history` dùng cho dòng thời gian trạng thái (FR-40), sắp cũ → mới.

### Lỗi

| HTTP | `code`                         | Khi nào                                                                                             |
| ---- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| 422  | `CART_EMPTY`                   | Giỏ trống (đặt từ giỏ, hoặc preview `source = cart`)                                               |
| 422  | `SKU_NOT_AVAILABLE`            | Giỏ có dòng `isSellable = false`                                                                    |
| 422  | `MAX_QTY_EXCEEDED`             | Một SKU > 20 cuốn                                                                                   |
| 409  | `OUT_OF_STOCK`                 | Không đủ tồn lúc đặt; chưa tạo đơn, giỏ giữ nguyên → gọi lại `GET /cart` để xem `availableQuantity` |
| 422  | `PAYMENT_METHOD_NOT_SUPPORTED` | Phương thức ngoài COD/chuyển khoản                                                                  |
| 409  | `IDEMPOTENCY_KEY_REUSED`       | Key đã dùng cho đơn của người khác/số điện thoại khác → tạo key mới                                 |
| 422  | `ORDER_NOT_CANCELLABLE`        | Trạng thái không còn hủy được (đã `paid` chờ xác nhận, hoặc từ đóng gói trở đi)                     |
| 404  | `NOT_FOUND`                    | Sai mã đơn, sai số điện thoại, sai `guestAccessToken`, hoặc đơn không phải của mình                 |
| 409  | `CHECKOUT_TOTAL_CHANGED`       | `expectedTotal` khác tổng tính lại → gọi lại preview cho khách xem số mới                           |
| 422  | `ADDRESS_NOT_SUPPORTED`        | Tỉnh nằm ngoài vùng giao hàng                                                                       |
| 422  | `TOO_MANY_OPEN_ORDERS` / `COD_NOT_ALLOWED` | Chống bom hàng COD theo số điện thoại → gợi ý chuyển khoản                              |
| 422  | `COUPON_*`, `PROMOTION_UNAVAILABLE` | Mã giảm giá / khuyến mãi, xem `docs/features/checkout-promotion-shipping.md`                   |

## Admin — người dùng và phân quyền

Mọi API dưới `/api/v1/admin` yêu cầu Bearer token của nhân viên **đã qua 2FA** và đúng vai trò trong bảng dưới; thiếu token → 401, sai vai trò hoặc chưa 2FA → 403 `FORBIDDEN`. FE nên ẩn menu theo `user.roles`.

| Nhóm API                                                                                      | super\_admin | product\_manager | warehouse\_keeper | order\_manager | customer\_service | accountant | marketing |
| --------------------------------------------------------------------------------------------- | ------------ | ---------------- | ----------------- | -------------- | ----------------- | ---------- | --------- |
| Catalog (`/admin/books`, `/editions`, `/skus`, `/categories`, `/authors`, `/legal-documents`, `/uploads/cover-signature`) | Có | Có | — | — | — | — | — |
| Lịch giá, khuyến mãi (`/admin/skus/{skuId}/price-schedules`, `/admin/price-schedules`, `/admin/promotions`, `/admin/coupons`) | Có | Có | — | — | — | — | Có |
| Nội dung (`/admin/popups`, `/admin/uploads/popup-signature`)                                  | Có           | —                | —                 | —              | —                 | —          | Có        |
| Kho (`/admin/inventory/...`)                                                                  | Có           | —                | Có                | —              | —                 | —          | —         |
| Duyệt/từ chối phiếu nhập                                                                      | Có           | —                | —                 | —              | —                 | —          | —         |
| Xem đơn (`GET /admin/orders`)                                                                 | Có           | —                | —                 | Có             | Có                | Có         | —         |
| Đổi trạng thái đơn                                                                            | Có           | —                | —                 | Có             | —                 | —          | —         |
| Vận chuyển (`/admin/shipping/...`)                                                            | Có           | —                | —                 | Có             | —                 | —          | —         |
| Người dùng (`/admin/users`, `/admin/customers`)                                               | Có           | —                | —                 | —              | —                 | —          | —         |

Khách hàng có vai trò `customer`. Tên policy tương ứng: `catalog_admin`, `pricing_admin`, `content_admin`, `inventory_admin`, `inventory_approve`, `orders_read`, `orders_manage`, `shipping_admin`, `users_admin` (`docs/features/auth.md`).

### Endpoint

| Method | Route                              | Request                                               | Response                                      |
| ------ | ---------------------------------- | ----------------------------------------------------- | --------------------------------------------- |
| GET    | `/api/v1/admin/users?q=&page=&limit=` | `q` tìm trong email, họ tên, SĐT (≤ 200)           | 200 phân trang `UserResponse` (chỉ nhân viên, theo id) |
| POST   | `/api/v1/admin/users`              | `{ email, fullName, password, roles[] }`              | 201 `UserResponse`                            |
| PUT    | `/api/v1/admin/users/{id}/roles`   | `{ roles[] }` — danh sách đầy đủ, thay thế vai trò cũ | 200 `UserResponse`                            |
| PUT    | `/api/v1/admin/users/{id}/password` | `{ newPassword }` (8–128)                            | 204; mở khóa, thu hồi mọi phiên               |
| POST   | `/api/v1/admin/users/{id}/deactivate`, `/activate` | —                                      | 200 `UserResponse` (`isActive`)               |
| POST   | `/api/v1/admin/users/{id}/logout`  | —                                                     | 200 `{ revokedSessions }` (đăng xuất hộ ngay) |
| POST   | `/api/v1/admin/users/{id}/impersonate` | —                                                 | 200 `AuthResponse` (`docs/features/fast-login-super-admin.md`) |
| GET    | `/api/v1/admin/customers?q=&page=&limit=` | như `/admin/users`                             | 200 phân trang `UserResponse` (chỉ khách hàng, mới đăng ký trước) |
| GET    | `/api/v1/admin/customers/{id}`     | —                                                     | 200 `{ account, addresses[], invoiceInfo }`   |

```json
{
  "email": "kho@sachluat.vn",
  "fullName": "Trần Thủ Kho",
  "password": "mat-khau-tam-thoi",
  "roles": ["warehouse_keeper"]
}
```

- `POST`: `roles` không rỗng, chỉ gồm vai trò nhân viên; mật khẩu 8–128 ký tự (mật khẩu tạm, nhân viên tự đổi qua `/auth/password/change`). Nhân viên mới phải bật 2FA ở lần đăng nhập đầu.
- `PUT roles`: nhận mọi vai trò kể cả `customer`, **trừ** `super_admin` (cả `POST` lẫn `PUT` có `super_admin` → 400 `VALIDATION_ERROR`); chỉ đổi được tài khoản dưới cấp (không phải chính mình, không phải Super Admin). Đặt mật khẩu, vô hiệu hóa/kích hoạt cũng theo quy tắc dưới cấp này.
- Đổi vai trò có hiệu lực từ lần refresh token kế tiếp của người đó (tối đa 15 phút).

Lỗi: `EMAIL_TAKEN` (409), `USER_NOT_FOUND` (404), `CANNOT_MANAGE_USER` (422), `CANNOT_IMPERSONATE` (422), `ACCOUNT_DISABLED` (403, đăng nhập hộ tài khoản đã vô hiệu hóa), `VALIDATION_ERROR` (400, vai trò không hợp lệ).

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
| PUT                               | `/api/v1/admin/skus/{id}`                       | `{ listPrice, salePrice, allowPreorder }` (`salePrice` = giá bán thường, điền form từ `regularSalePrice`) | `AdminBookResponse`                                     |
| GET / POST                        | `/api/v1/admin/skus/{skuId}/price-schedules`    | `{ salePrice, startsAt, endsAt, note? }` (policy `pricing_admin`) | `PriceScheduleResponse[]` (mới nhất trước) / 201 `PriceScheduleResponse` |
| PUT / DELETE                      | `/api/v1/admin/price-schedules/{id}`            | như trên                                                     | `PriceScheduleResponse` / 204                                            |
| POST                              | `/api/v1/admin/uploads/cover-signature`         | —                                                            | `{ uploadUrl, apiKey, timestamp, folder, allowedFormats, signature }`   |
| GET                               | `/api/v1/admin/categories`                      | —                                                            | Mảng phẳng `CategoryResponse` (FE tự dựng cây theo `parentId`)           |
| POST / PUT `{id}` / DELETE `{id}` | `/api/v1/admin/categories`                      | `{ name, slug, parentId?, sortOrder }`                       | 201 / 200 `CategoryResponse` / 204                                       |
| GET                               | `/api/v1/admin/authors?q=&page=&limit=`         | —                                                            | Phân trang `AuthorResponse`                                              |
| POST / PUT `{id}` / DELETE `{id}` | `/api/v1/admin/authors`                         | `{ name, slug, biography?, sortOrder }`                      | 201 / 200 `AuthorResponse` / 204                                         |
| GET                               | `/api/v1/admin/legal-documents?q=&page=&limit=` | —                                                            | Phân trang `LegalDocumentResponse` (`q` tìm theo số hiệu hoặc trích yếu) |
| POST / PUT `{id}` / DELETE `{id}` | `/api/v1/admin/legal-documents`                 | `{ docNumber, docType, title, issuedDate?, effectiveDate? }` | 201 / 200 `LegalDocumentResponse` / 204                                  |

`q` của `/admin/books` khớp tên chứa chuỗi, đúng slug, đúng ISBN hoặc đúng mã SKU (không phân biệt hoa thường); `status` = `draft`, `active`, `hidden`. Xóa danh mục/tác giả/văn bản là **xóa mềm** (ẩn khỏi mọi danh sách, slug dùng lại được). Đầu sách, ấn bản, SKU không có API xóa: ẩn bằng trạng thái `hidden` / `discontinued`.

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
| `coverImageUrl?` / `previewFileUrl?` | string               | URL ≤ 500. Ảnh bìa upload lên Cloudinary bằng `cover-signature`; khi backend đã cấu hình Cloudinary, `coverImageUrl` phải bắt đầu bằng `https://res.cloudinary.com/{CloudName}/image/upload/` (không thì 400). File đọc thử chưa có API upload |
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

// PriceScheduleResponse — status: scheduled | running | ended (tính lúc trả về)
{ "id": 9, "skuId": 100, "salePrice": 120000, "discountPercent": 40, "startsAt": "2026-10-31T17:00:00Z", "endsAt": "2026-11-07T17:00:00Z",
  "note": "Sale mùa thi", "status": "scheduled", "createdAt": "2026-10-26T03:00:00Z", "updatedAt": "2026-10-26T03:00:00Z" }
```

Lịch giá: `salePrice` số nguyên VNĐ **thấp hơn** giá bán thường, `endsAt` > `startsAt` (gửi kèm offset, ví dụ `+07:00`), `note` ≤ 255; một SKU không có hai lịch chồng thời gian; lịch đã kết thúc không sửa/xóa được.

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
| 409  | `PRICE_SCHEDULE_OVERLAP`                     | Lịch giá chồng thời gian với lịch khác của SKU                                                                                                         |
| 422  | `PRICE_SCHEDULE_ENDED`                       | Sửa/xóa lịch giá đã kết thúc                                                                                                                           |
| 503  | `UPLOAD_NOT_CONFIGURED`                      | Backend chưa cấu hình Cloudinary (API chữ ký upload)                                                                                                   |
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
  "costOfGoods": null,
  "customerRisk": {
    "totalOrders": 4, "deliveredCount": 2, "cancelledCount": 1, "failedCodCount": 0, "openCodCount": 1,
    "codBlocked": false, "openCodLimitReached": false, "codAllowed": true
  }
}
```

`userId` = `null` với khách vãng lai. `costOfGoods` = tổng giá vốn theo lô đã xuất (có từ khi `packing`), dùng tính lợi nhuận gộp; khách không thấy field này. `customerRisk` = lịch sử đơn theo số điện thoại của đơn (mọi đơn, kể cả đơn này) để CSKH cân nhắc khi gọi xác nhận; `POST .../status` cũng trả field này.

&#91;embedded content: trạng thái đơn hàng · 15 trạng thái theo mục 16.1\]

Chuyển trạng thái sai bảng trả 409 `ORDER_INVALID_TRANSITION`. Tác động đi kèm mỗi lần chuyển:

| Chuyển sang           | Tác động                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| `paid`                | `paymentStatus = paid` (đối soát chuyển khoản thủ công)                                           |
| `packing`             | Trừ tồn thật theo FIFO lô in, ghi giá vốn từng dòng                                               |
| `cancelled`           | Hoàn tồn tạm giữ và trả lượt dùng khuyến mãi/mã giảm giá                                          |
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
| `LoginPortal`               | `storefront` · `admin`                                                                                                                                                                                                              | App gọi `/auth/login`                                                                                                                                                                                               |
| `ColorTheme`                | `dark` · `light`                                                                                                                                                                                                                    | Tối · Sáng (`null` = chưa chọn)                                                                                                                                                                                     |
| `PriceScheduleStatus`       | `scheduled` · `running` · `ended`                                                                                                                                                                                                   | Chờ chạy · Đang chạy · Đã kết thúc                                                                                                                                                                                  |
| `PopupDisplayFrequency`     | `every_visit` · `once_per_session` · `once_per_day`                                                                                                                                                                                 | Mỗi lần tải trang · Mỗi phiên · Mỗi ngày                                                                                                                                                                            |
| `PopupStatus`               | `inactive` · `scheduled` · `running` · `ended`                                                                                                                                                                                      | Đang tắt · Chờ đến lịch · Đang chạy · Đã kết thúc                                                                                                                                                                   |
| `CheckoutSource`            | `cart` · `buy_now`                                                                                                                                                                                                                  | Xem trước cho giỏ · Mua ngay                                                                                                                                                                                        |
| `PromotionKind`             | `order_discount` · `free_shipping`                                                                                                                                                                                                  | Giảm trên đơn · Giảm phí ship                                                                                                                                                                                       |
| `PromotionMode`             | `automatic` · `coupon`                                                                                                                                                                                                              | Tự áp · Nhập mã                                                                                                                                                                                                     |
| `DiscountType`              | `percent` · `fixed_amount`                                                                                                                                                                                                          | Theo % · Số tiền                                                                                                                                                                                                    |
| `PromotionScopeType`        | `all` · `books` · `skus` · `categories`                                                                                                                                                                                             | Mọi sách · Đầu sách · SKU · Danh mục                                                                                                                                                                                |
| `PromotionAudience`         | `everyone` · `members_only`                                                                                                                                                                                                         | Mọi khách · Chỉ thành viên                                                                                                                                                                                          |
| `PromotionStatus`           | `inactive` · `scheduled` · `running` · `ended` · `exhausted`                                                                                                                                                                        | Đang tắt · Chờ chạy · Đang chạy · Đã kết thúc · Hết lượt                                                                                                                                                            |

## Bảng mã lỗi

FE rẽ nhánh theo `code` (ổn định), không theo `title` (có thể đổi câu chữ). Lỗi nghiệp vụ có `title` tiếng Việt hiển thị được cho khách; lỗi chung (nhóm đầu) nên dùng câu chữ của FE.

| `code`                                    | HTTP      | Nhóm          | FE xử lý                                                                              |
| ----------------------------------------- | --------- | ------------- | ------------------------------------------------------------------------------------- |
| `VALIDATION_ERROR`                        | 400       | Chung         | Hiển thị lỗi theo từng field trong `errors`                                           |
| `UNAUTHORIZED`                            | 401       | Chung         | Thử `/auth/refresh` một lần, thất bại thì về màn đăng nhập                            |
| `FORBIDDEN`                               | 403       | Chung         | Không đủ quyền hoặc nhân viên chưa bật 2FA → màn bật 2FA nếu `requiresTwoFactorSetup` |
| `NOT_FOUND`                               | 404       | Chung         | Trang 404 / thông báo không tìm thấy                                                  |
| `METHOD_NOT_ALLOWED`                      | 405       | Chung         | Lỗi tích hợp (sai method)                                                             |
| `CONFLICT`                                | 409       | Chung         | Hiển thị `title`                                                                      |
| `TOO_MANY_REQUESTS`                       | 429       | Chung         | Báo “thao tác quá nhanh”, chờ rồi thử lại                                             |
| `INTERNAL_ERROR`                          | 500       | Chung         | Thông báo chung, hiển thị `traceId` để khách báo CSKH                                 |
| `INVALID_CREDENTIALS`                     | 401       | Auth          | Sai email/mật khẩu; **không** gọi refresh                                             |
| `ACCOUNT_LOCKED`                          | 423       | Auth          | Khóa 15 phút                                                                          |
| `EMAIL_TAKEN`                             | 409       | Auth          | Gợi ý đăng nhập                                                                       |
| `INVALID_REFRESH_TOKEN`                   | 401       | Auth          | Xóa phiên, về màn đăng nhập                                                           |
| `TWO_FACTOR_TOKEN_INVALID`                | 401       | Auth          | Quay lại bước nhập mật khẩu                                                           |
| `OTP_INVALID`                             | 400       | Auth          | Mã 6 số sai, cho nhập lại                                                             |
| `TWO_FACTOR_ALREADY_ENABLED`              | 409       | Auth          | Đã bật 2FA                                                                            |
| `USER_NOT_FOUND`                          | 404       | Auth          | —                                                                                     |
| `ROLE_INVALID` / `CANNOT_MANAGE_USER`     | 422       | Auth          | Hiển thị `title` (`ROLE_INVALID` có khai báo nhưng hiện backend không trả; vai trò sai là 400 `VALIDATION_ERROR`) |
| `CANNOT_IMPERSONATE`                      | 422       | Auth          | Không đăng nhập hộ chính mình / Super Admin khác                                      |
| `ACCOUNT_DISABLED`                        | 403       | Auth          | Tài khoản đã bị vô hiệu hóa, liên hệ quản trị viên                                    |
| `SUPER_ADMIN_PORTAL_FORBIDDEN`            | 403       | Auth          | Super Admin đăng nhập ở storefront → dùng app Admin                                   |
| `ADDRESS_NOT_FOUND` / `ADDRESS_LIMIT_REACHED` | 404 / 422 | Auth (sổ địa chỉ) | Tải lại sổ / đã đủ 10 địa chỉ                                                  |
| `AVATAR_URL_INVALID`                      | 422       | Auth (avatar) | Upload lại ảnh                                                                        |
| `REALTIME_UNAVAILABLE`                    | 503       | Auth          | Backend chưa cấu hình Pusher, bỏ qua realtime                                         |
| `IDENTITY_ERROR`                          | 422       | Auth          | Lỗi Identity hiếm gặp, hiển thị `title`                                               |
| `UPLOAD_NOT_CONFIGURED`                   | 503       | Upload        | Chưa cấu hình Cloudinary: gợi ý dán link ảnh                                          |
| `SLUG_DUPLICATE` / `SLUG_INVALID`         | 409 / 422 | Catalog       | Báo ở field `slug`                                                                    |
| `ISBN_DUPLICATE` / `ISBN_INVALID`         | 409 / 422 | Catalog       | Báo ở field `isbn`                                                                    |
| `SKU_CODE_DUPLICATE` / `SKU_CODE_INVALID` | 409 / 422 | Catalog       | Báo ở field `skuCode`                                                                 |
| `SKU_COVER_DUPLICATE`                     | 409       | Catalog       | Ấn bản đã có SKU loại bìa này                                                         |
| `PRICE_INVALID`                           | 422       | Catalog       | Báo ở field giá                                                                       |
| `EDITION_NOT_FOUND`                       | 404       | Catalog       | —                                                                                     |
| `CATEGORY_PARENT_INVALID`                 | 422       | Catalog       | Danh mục cha không hợp lệ                                                             |
| `CATEGORY_HAS_CHILDREN`                   | 409       | Catalog       | Chuyển/xóa danh mục con trước                                                         |
| `PRICE_SCHEDULE_OVERLAP` / `PRICE_SCHEDULE_ENDED` | 409 / 422 | Catalog (lịch giá) | Chọn khoảng thời gian khác / lịch đã kết thúc                             |
| `REFERENCE_NOT_FOUND`                     | 422       | Catalog, Kho  | Tải lại danh sách chọn (id đã bị xóa)                                                 |
| `OUT_OF_STOCK`                            | 409       | Kho, Giỏ, Đơn | Báo hết hàng, tải lại giỏ                                                             |
| `RECEIPT_NOT_DRAFT`                       | 409       | Kho           | Tải lại phiếu                                                                         |
| `RECEIPT_SELF_APPROVAL`                   | 403       | Kho           | Cần người khác duyệt                                                                  |
| `BATCH_CODE_DUPLICATE`                    | 409       | Kho           | Báo ở dòng có mã lô trùng                                                             |
| `RECEIPT_EMPTY`                           | 422       | Kho           | Thêm dòng                                                                             |
| `MAX_QTY_EXCEEDED`                        | 422       | Giỏ, Đơn      | > 20 cuốn/SKU → gợi ý báo giá sỉ                                                      |
| `SKU_NOT_AVAILABLE`                       | 422       | Giỏ, Đơn      | Sách ngừng bán, xóa khỏi giỏ                                                          |
| `CART_FULL`                               | 422       | Giỏ           | Đã 50 loại sách                                                                       |
| `CART_EMPTY`                              | 422       | Đơn           | Về trang giỏ                                                                          |
| `PAYMENT_METHOD_NOT_SUPPORTED`            | 422       | Đơn           | Chỉ cho chọn COD / chuyển khoản                                                       |
| `IDEMPOTENCY_KEY_REUSED`                  | 409       | Đơn           | Sinh key mới rồi gửi lại                                                              |
| `ORDER_NOT_CANCELLABLE`                   | 422       | Đơn           | Ẩn nút hủy, hướng dẫn liên hệ CSKH                                                    |
| `CHECKOUT_TOTAL_CHANGED`                  | 409       | Đơn           | Gọi lại `/checkout/preview`, cho khách xác nhận số mới                                |
| `TOO_MANY_OPEN_ORDERS` / `COD_NOT_ALLOWED` | 422      | Đơn           | Không cho COD với số điện thoại này, gợi ý chuyển khoản                               |
| `ADDRESS_NOT_SUPPORTED`                   | 422       | Vận chuyển    | Chưa hỗ trợ giao đến tỉnh này, chặn đặt hàng                                          |
| `SHIPPING_PROVINCE_DUPLICATE`             | 409       | Admin vận chuyển | Tỉnh đã thuộc vùng giao hàng khác                                                  |
| `COUPON_INVALID` / `COUPON_EXPIRED` / `COUPON_MIN_ORDER` / `COUPON_NOT_APPLICABLE` / `COUPON_LOGIN_REQUIRED` | 422 | Khuyến mãi | Hiển thị `title` dưới ô mã (`docs/features/checkout-promotion-shipping.md`) |
| `PROMOTION_UNAVAILABLE`                   | 422       | Khuyến mãi    | Ưu đãi tự áp vừa hết lượt/hết hạn lúc đặt: preview lại                               |
| `COUPON_CODE_DUPLICATE` / `PROMOTION_NOT_COUPON` | 409 / 422 | Admin khuyến mãi | Mã trùng / chương trình tự áp không thêm mã được                          |
| `ORDER_INVALID_TRANSITION`                | 409       | Admin đơn     | Tải lại đơn (người khác vừa đổi), dựng lại nút từ `nextStatuses`                      |
| `ORDER_NOT_PAID`                          | 422       | Admin đơn     | Không hoàn tiền đơn chưa thanh toán                                                   |

## Luồng gợi ý và việc chưa có

### Luồng mua hàng (website)

1. Trang chủ / danh mục: `GET /api/v1/categories` (menu) + `GET /api/v1/books?category=<slug>&page=1`.
2. Chi tiết: `GET /api/v1/books/{slug}`; chọn ấn bản và loại bìa ngay trên dữ liệu đã tải.
3. Thêm giỏ: `POST /api/v1/cart/items` (hỏi xác nhận trước nếu chọn ấn bản cũ).
4. Giỏ: `GET /api/v1/cart` + `POST /api/v1/checkout/preview` (`source = cart`) để có tổng tiền do backend tính.
5. Thanh toán: sinh `Idempotency-Key` khi vào trang, `POST /api/v1/checkout/preview` mỗi khi đổi tỉnh/mã/SĐT, rồi `POST /api/v1/orders` (hoặc `/orders/buy-now`) kèm `expectedTotal`.
6. Trang cảm ơn hiển thị `orderCode`; khách vãng lai xem/hủy đơn qua link `guestAccessToken` (`/api/v1/orders/guest/{token}`) hoặc tra cứu bằng `POST /api/v1/orders/lookup`, thành viên dùng `GET /api/v1/orders`.

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

1. Đăng nhập với `portal = admin`; nếu `requiresTwoFactor` → nhập mã 6 số; nếu `user.requiresTwoFactorSetup` → màn bật 2FA (QR).
2. Hiện menu theo `user.roles` (bảng quyền ở mục Admin — người dùng).
3. Nhập sách: tạo danh mục/tác giả/văn bản → tạo đầu sách → thêm ấn bản → thêm SKU → đặt đầu sách `active`, ấn bản `on_sale`.
4. Nhập kho: thủ kho lập phiếu → Super Admin duyệt → sách có `inStock = true` trên website.
5. Xử lý đơn: danh sách `status=pending_confirm` → `confirmed` → `packing` → `ready_to_ship` → `shipping` → `delivered`.

### Chưa có trong API (giai đoạn 1)

| Hạng mục                                                                      | Hiện trạng                              | FE tạm làm gì                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| CORS cho trình duyệt gọi thẳng khác site                                      | Đã bật theo `Cors:AllowedOrigins`, nhưng cookie `sl_refresh` là `SameSite=Strict` | Proxy `/api/v1` qua Next.js (`proxy.ts`)                 |
| Cổng thanh toán VNPAY/MoMo/ZaloPay/VietQR                                     | Chưa có                                 | Chỉ hiện COD và chuyển khoản; thông tin tài khoản nhận tiền là nội dung tĩnh |
| Phí ship theo đơn vị vận chuyển (GHN/GHTK...)                                 | Biểu phí tự quản lý theo vùng tỉnh + trọng lượng, có thời gian giao dự kiến | Dùng `/checkout/preview` hoặc `/shipping/quote` |
| Combo, giá sỉ                                                                 | Chưa có (đã có mã giảm giá và khuyến mãi tự áp) | —                                                                    |
| Đặt trước (pre-order)                                                         | Chưa có                                 | Ấn bản `upcoming` chỉ hiển thị                                               |
| Tìm kiếm không dấu, theo tác giả, gợi ý khi gõ (`/search`)                    | Chỉ có `q` theo tên/ISBN/mã SKU, phân biệt dấu | Dùng `GET /books?q=`                                                         |
| Lọc còn hàng, sắp bán chạy / đánh giá cao                                     | Chưa có (đã có `onSale`)                | Ẩn các lựa chọn này                                                          |
| Xác thực email/OTP, quên mật khẩu, đăng nhập mạng xã hội                      | Chưa có                                 | Ẩn link “Quên mật khẩu”                                                      |
| Yêu thích, đánh giá, đăng ký nhận tin ấn bản mới                              | Chưa có (sổ địa chỉ đã có: `/me/addresses`) | —                                                                        |
| Yêu cầu đổi trả phía khách, hóa đơn điện tử                                   | Chưa có                                 | Hướng dẫn liên hệ CSKH                                                       |
| Upload file đọc thử                                                           | Chỉ lưu URL (ảnh bìa, popup, avatar đã upload được qua Cloudinary) | Dán URL đã upload nơi khác                        |
| Nội dung (bài viết, banner, trang tĩnh), dashboard, báo cáo, nhật ký thao tác | Chưa có (đã có popup)                   | —                                                                            |
| Tên người thao tác trong thẻ kho / phiếu nhập                                 | Chỉ có user id                          | Hiển thị id                                                                  |

Lỗi đã biết: `sort=newest` hiện để sách **chưa có `releaseDate`** lên đầu danh sách (PostgreSQL xếp `NULL` trước khi sắp giảm dần); backend sẽ sửa. Admin nên nhập `releaseDate` cho mọi ấn bản.
