# Ảnh đại diện (avatar) người dùng

> **Trạng thái (24/10/2026)**: backend đã có API (commit `bf488bc` repo backend), **FE đã làm** (xem "Hạn chế / việc
> còn lại"). Đặc tả gốc ở mục "Ảnh đại diện" trong `docs/features/auth.md` của repo backend. Route `/me/avatar*` chưa có
> trong `openapi/v1.json` nên đang khai báo tạm ở `packages/api-client/src/pending-paths.ts`.
>
> **Code FE**: `Avatar` (`packages/ui`, ảnh tròn, chưa có ảnh hoặc ảnh lỗi thì hiện chữ cái đầu), `avatarImageUrl` /
> `nameInitials` (`packages/utils`), `apps/storefront/src/lib/avatar-api.ts` (upload, lưu, xóa, thông báo lỗi),
> `useChangeAvatar` (`lib/use-account.ts`), `features/account/AvatarField.tsx`.

## Mục đích

Mỗi tài khoản (khách và nhân viên) có một ảnh đại diện. Khách tự đổi/xóa ở storefront; Admin thấy avatar trong danh
sách và chi tiết nhân viên/khách hàng.

## Luồng xử lý (màn hình, route, app storefront/admin)

### Storefront: đổi avatar ở `/tai-khoan`

Mục ảnh nằm đầu khung "Thông tin cá nhân": nút "Tải ảnh lên"/"Đổi ảnh" (chọn file là lưu ngay, không cần bấm "Lưu
thông tin") và "Xóa ảnh". Chỉ nhận JPG, PNG, WebP (đúng `allowedFormats` của chữ ký), tối đa 10 MB.

Giống upload ảnh bìa ở admin (`apps/admin/src/lib/image-upload.ts`): file đi **thẳng từ trình duyệt lên Cloudinary**,
backend chỉ ký và lưu link.

1. Kiểm tra file phía FE: là ảnh (`image/*`), ≤ 10 MB (cùng `MAX_IMAGE_BYTES` của admin).
2. `POST /api/v1/me/avatar/upload-signature` (Bearer, không body) → chữ ký.
3. `POST` `multipart/form-data` tới `uploadUrl` với **đúng** các field dưới, thêm/bớt field là sai chữ ký:

   | Field form        | Lấy từ response              |
   | ----------------- | ---------------------------- |
   | `file`            | file người dùng chọn         |
   | `api_key`         | `apiKey`                     |
   | `timestamp`       | `timestamp` (đổi sang chuỗi) |
   | `public_id`       | `publicId`                   |
   | `overwrite`       | chuỗi `"true"`               |
   | `allowed_formats` | `allowedFormats`             |
   | `signature`       | `signature`                  |

   **Khác ảnh bìa/popup**: **không** gửi `folder`, nên **không dùng lại được** `cloudinaryFormData()` của admin. Cần một
   hàm riêng, hoặc tách phần dùng chung ra `packages/`.

4. Cloudinary trả JSON có `secure_url` → `PUT /api/v1/me/avatar` với `{ "avatarUrl": secure_url }`.
5. Thành công: cập nhật cache hồ sơ (`["account", <user>, ...]`) và **refresh phiên** để avatar trên header đổi theo
   (cách làm giống khi đổi họ tên).

Nút **"Xóa ảnh"**: `DELETE /api/v1/me/avatar` → 204, rồi cập nhật cache như bước 5.

**Phiên đăng nhập hộ** (Super Admin fast login, `loginVia: "admin"`): **ẩn** nút đổi/xóa avatar, chỉ hiện ảnh kèm dòng
giải thích, giống việc không ghi `theme` lên tài khoản của khách (`storefront-theme.md`). Backend **không chặn** việc
này, FE tự chặn. Phiên này cũng không refresh được (refresh sẽ kết thúc phiên đăng nhập hộ).

### Hiển thị

- Avatar có trong `user` của **mọi** `AuthResponse` (login, refresh, 2FA, register, fast login) và trong `GET /me`, nên
  header (`AccountNav`) có ngay sau khi vào phiên, không cần gọi thêm API.
- Admin: `avatarUrl` có trong từng dòng của `GET /admin/users`, `GET /admin/customers`, và trong `account` của
  `GET /admin/customers/{id}`.
- `avatarUrl: null` nghĩa là chưa có ảnh: hiện ảnh mặc định, ví dụ chữ cái đầu của `fullName`.
- Ảnh gốc **không được resize** khi upload (có thể vài MB). Khi hiển thị, chèn transformation vào link, ví dụ thêm
  `c_fill,g_face,w_96,h_96,f_auto,q_auto/` ngay sau `/image/upload/` (kích thước chọn theo chỗ hiển thị, nhân 2 cho
  màn retina). Chỉ chèn với link `https://res.cloudinary.com/...`; link khác (môi trường dev) giữ nguyên.
- `Avatar` dùng `<img>` (package `ui` không phụ thuộc Next.js), nên không cần `images.remotePatterns`. Cỡ đang dùng:
  header storefront 36 px, trang tài khoản 88 px, danh sách nhân viên/khách 48 px, chi tiết khách 96 px; link Cloudinary
  lấy gấp đôi cỡ hiển thị.
- Mỗi user chỉ có **một** `publicId` cố định: upload mới ghi đè ảnh cũ, nhưng `secure_url` mới có version khác
  (`/v1712345678/`), nên link mới không bị cache ảnh cũ. **Luôn lưu đúng `secure_url` vừa nhận**, không tự ghép link.

## API (method, route, request, response, mã lỗi)

Tiền tố `/api/v1`, đều cần Bearer (chưa đăng nhập → 401).

| Method | Route                         | Request       | Response                             |
| ------ | ----------------------------- | ------------- | ------------------------------------ |
| POST   | `/me/avatar/upload-signature` | —             | 200 `ReplaceUploadSignatureResponse` |
| PUT    | `/me/avatar`                  | `{avatarUrl}` | 200 `{avatarUrl}`                    |
| DELETE | `/me/avatar`                  | —             | 204                                  |

```json
// POST /me/avatar/upload-signature
{
  "uploadUrl": "https://api.cloudinary.com/v1_1/<cloud>/image/upload",
  "apiKey": "123456789012345",
  "timestamp": 1761300000,
  "publicId": "sachluat/avatars/42-3f9a1c0b7d2e8a64",
  "overwrite": true,
  "allowedFormats": "jpg,jpeg,png,webp",
  "signature": "a9f13e1da18b665c6658a667edd50b2055e70a9d"
}
```

Field mới trong `UserResponse` / `MeResponse`: `avatarUrl: string | null`.

| Mã lỗi (`code`)         | HTTP | Khi nào                                                                              | Gợi ý thông báo                                   |
| ----------------------- | ---- | ------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `UPLOAD_NOT_CONFIGURED` | 503  | Server chưa cấu hình Cloudinary (thường là local)                                    | "Chưa tải được ảnh lúc này, anh/chị thử lại sau." |
| `AVATAR_URL_INVALID`    | 422  | Link không phải ảnh avatar của chính tài khoản (sai `publicId`, sai cloud, sai đuôi) | "Tải ảnh không thành công, anh/chị thử lại."      |
| `VALIDATION_ERROR`      | 400  | `avatarUrl` rỗng, không phải `https`, hoặc dài hơn 500 ký tự                         | Như trên                                          |
| `USER_NOT_FOUND`        | 404  | Tài khoản không còn                                                                  |                                                   |

Lỗi từ **Cloudinary** (bước 3, không phải `ProblemDetails`): 400 khi sai định dạng (chỉ nhận jpg/jpeg/png/webp), ảnh
vượt giới hạn của gói, hoặc chữ ký quá 1 giờ. Nên lấy chữ ký **ngay trước khi upload**, không lấy sẵn lúc mở trang.

Khi server **chưa cấu hình Cloudinary** (local/test), `PUT /me/avatar` nhận mọi link `https`, nên có thể test UI bằng
link ảnh bất kỳ.

## Cấu hình cần thiết

- FE: không cần biến môi trường mới.
- Backend phải chạy migration `AddUserAvatarUrl` và cấu hình `Cloudinary:*` (đã có sẵn cho ảnh bìa).
- Sau khi backend deploy: `pnpm --filter @slvn/api-client api:fetch` rồi `pnpm api:generate` để type mới có
  `avatarUrl` và các route `/me/avatar*`, rồi xóa khai báo `/me/avatar*` trong `pending-paths.ts`.

## Thay đổi CSDL (migration liên quan)

Không thuộc FE (cột `auth.users.avatar_url`, migration `AddUserAvatarUrl` ở backend).

## Hạn chế / việc còn lại

- FE đã làm: đổi/xóa avatar ở `/tai-khoan`, avatar trên header storefront (`AccountNav`), avatar trong danh sách nhân
  viên/khách hàng (`UserCard`) và trang chi tiết khách ở admin. Header **admin** chưa hiện avatar của nhân viên đang
  đăng nhập, và nhân viên chưa tự đổi avatar được (admin chưa có trang hồ sơ cá nhân).
- Đổi/xóa avatar xong thì refresh phiên để header cập nhật; refresh lỗi (mất mạng) thì báo lỗi dù ảnh đã lưu, tải lại
  trang là thấy ảnh mới.
- Backend chưa resize ảnh khi upload và không xóa ảnh trên Cloudinary khi khách bỏ avatar (lần upload sau ghi đè).
- Admin chưa đổi/xóa avatar hộ khách được.
- Chưa có bước cắt ảnh (crop) trước khi upload; tạm dùng `c_fill,g_face` khi hiển thị.
