# Ảnh đại diện (avatar) người dùng

> **Trạng thái**: backend đã có API (commit `bf488bc` repo backend), **FE chưa làm**. File này là bàn giao cho FE;
> đặc tả gốc ở mục "Ảnh đại diện" trong `docs/features/auth.md` của repo backend.

## Mục đích

Mỗi tài khoản (khách và nhân viên) có một ảnh đại diện. Khách tự đổi/xóa ở storefront; Admin thấy avatar trong danh
sách và chi tiết nhân viên/khách hàng.

## Luồng xử lý (màn hình, route, app storefront/admin)

### Storefront: đổi avatar ở `/tai-khoan` (đề xuất)

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

**Phiên đăng nhập hộ** (Super Admin fast login, `loginVia: "admin"`): đề xuất **ẩn** nút đổi/xóa avatar, giống việc
không ghi `theme` lên tài khoản của khách (`storefront-theme.md`). Backend **không chặn** việc này, FE tự quyết.

### Hiển thị

- Avatar có trong `user` của **mọi** `AuthResponse` (login, refresh, 2FA, register, fast login) và trong `GET /me`, nên
  header (`AccountNav`) có ngay sau khi vào phiên, không cần gọi thêm API.
- Admin: `avatarUrl` có trong từng dòng của `GET /admin/users`, `GET /admin/customers`, và trong `account` của
  `GET /admin/customers/{id}`.
- `avatarUrl: null` nghĩa là chưa có ảnh: hiện ảnh mặc định, ví dụ chữ cái đầu của `fullName`.
- Ảnh gốc **không được resize** khi upload (có thể vài MB). Khi hiển thị, chèn transformation vào link, ví dụ thêm
  `c_fill,g_face,w_96,h_96,f_auto,q_auto/` ngay sau `/image/upload/` (kích thước chọn theo chỗ hiển thị, nhân 2 cho
  màn retina). Chỉ chèn với link `https://res.cloudinary.com/...`; link khác (môi trường dev) giữ nguyên.
- Dùng `next/image` thì kiểm tra `images.remotePatterns` trong `next.config.ts` đã cho phép `res.cloudinary.com`.
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
  `avatarUrl` và các route `/me/avatar*`.

## Thay đổi CSDL (migration liên quan)

Không thuộc FE (cột `auth.users.avatar_url`, migration `AddUserAvatarUrl` ở backend).

## Hạn chế / việc còn lại

- FE chưa làm: form đổi/xóa avatar ở `/tai-khoan`, avatar trên header storefront, avatar trong bảng nhân viên/khách
  hàng ở admin.
- Backend chưa resize ảnh khi upload và không xóa ảnh trên Cloudinary khi khách bỏ avatar (lần upload sau ghi đè).
- Admin chưa đổi/xóa avatar hộ khách được.
- Chưa có bước cắt ảnh (crop) trước khi upload; tạm dùng `c_fill,g_face` khi hiển thị.
