# Fast login Super Admin – Hướng dẫn tích hợp Frontend

Oct 24, 2026 · @Software DGP

## Tổng quan

Super Admin gọi một API là nhận được access token 15 phút của tài khoản cần hỗ trợ, không cần mật khẩu của người đó. Mọi phiên đăng nhập giờ có thêm cờ `loginVia`: `portal` là người dùng tự đăng nhập, `admin` là Super Admin đang vào hộ.

- **Ai gọi được**: tài khoản có vai trò `super_admin` và đã đăng nhập qua 2FA (policy `users_admin`).
- **Vào hộ được ai**: mọi tài khoản không có vai trò `super_admin`, gồm nhân viên và khách hàng.
- **Không vào hộ được**: chính mình và các Super Admin khác.
- **Trạng thái backend**: code và test đã xong nhưng chưa deploy. FE có thể dựng UI theo contract trong tài liệu này.

Ba điều FE cần nhớ:

1. Phiên vào hộ **chỉ có access token**, không có refresh token và không có cookie. Không gọi `/auth/refresh` cho phiên này.
2. Mọi response trả `AuthResponse` đều có thêm 2 field `loginVia` và `impersonatorId`.
3. Backend **không chặn thao tác nào** trong phiên vào hộ, nên FE phải luôn hiển thị rõ là đang đăng nhập hộ.

## API: `POST /api/v1/admin/users/{id}/impersonate`

Gọi bằng access token của Super Admin, không có body. Response trả về `AuthResponse` của tài khoản đích.

```http
POST /api/v1/admin/users/42/impersonate
Authorization: Bearer <access token của Super Admin, amr=mfa>
```

Response `200 OK`:

```json
{
  "accessToken": "eyJhbGciOi...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "loginVia": "admin",
  "impersonatorId": 1,
  "user": {
    "id": 42,
    "email": "kho@sachluat.vn",
    "fullName": "Thủ kho",
    "phoneNumber": null,
    "birthDate": null,
    "occupation": null,
    "roles": ["warehouse_keeper"],
    "twoFactorEnabled": true,
    "requiresTwoFactorSetup": false
  }
}
```

- `expiresIn` tính bằng giây, mặc định là 900 (15 phút), cấu hình qua `Jwt:AccessTokenMinutes`.
- Response **không có header `Set-Cookie`**, nên cookie `sl_refresh` của admin giữ nguyên.
- Token mang vai trò của tài khoản đích và `amr=mfa`. Nếu đích là nhân viên thì gọi được API Admin theo quyền của nhân viên đó, kể cả khi họ chưa bật 2FA.
- Lỗi trả về dạng `ProblemDetails`. FE đọc field `code`.

| HTTP | `code` | Khi nào | FE nên làm gì |
| --- | --- | --- | --- |
| 401 | `UNAUTHORIZED` | Thiếu token hoặc token admin đã hết hạn | Gọi `/auth/refresh` của admin rồi thử lại |
| 403 | `FORBIDDEN` | Không phải Super Admin, hoặc chưa đăng nhập qua 2FA | Ẩn nút đăng nhập hộ với người không phải Super Admin |
| 404 | `USER_NOT_FOUND` | Không có tài khoản với `id` này | Báo "Không tìm thấy người dùng" |
| 422 | `CANNOT_IMPERSONATE` | Đích là chính mình hoặc là Super Admin khác | Ẩn nút với các dòng này, hiển `detail` nếu vẫn gặp |

## Cờ `loginVia`

Cờ này có ở hai nơi với cùng giá trị: field `loginVia` trong mọi `AuthResponse`, và claim `login_via` trong access token. FE nên đọc từ `AuthResponse`. Chỉ cần decode JWT khi không còn giữ response, ví dụ sau khi chuyển sang tab khác.

| Nguồn | `loginVia` | `impersonatorId` |
| --- | --- | --- |
| `POST /auth/register` | `portal` | `null` |
| `POST /auth/login` (`session`) | `portal` | `null` |
| `POST /auth/login/2fa` | `portal` | `null` |
| `POST /auth/refresh` | `portal` | `null` |
| `POST /auth/2fa/enable` | `portal` | `null` |
| `POST /admin/users/{id}/impersonate` | `admin` | id của Super Admin |

Claim trong JWT của một phiên vào hộ:

```json
{
  "sub": "42",
  "email": "kho@sachluat.vn",
  "amr": "mfa",
  "login_via": "admin",
  "impersonator_id": "1",
  "role": "warehouse_keeper"
}
```

- Trong JWT, `impersonator_id` là **chuỗi**, vì mọi claim đều là string. Trong `AuthResponse`, `impersonatorId` là **số**.
- Phiên tự đăng nhập **không có** claim `impersonator_id`.
- Token cấp trước bản cập nhật này không có claim `login_via`, coi là `portal`.
- `GET /me` **không** trả cờ này, vì đây là thuộc tính của phiên, không phải của tài khoản.

```ts
type LoginVia = "portal" | "admin";

interface AuthResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  loginVia: LoginVia;
  impersonatorId: number | null;
  user: UserResponse;
}
```

## Luồng tích hợp gợi ý

Trong phiên vào hộ, token chỉ được giữ trong bộ nhớ của tab đang vào hộ, và tab đó **không bao giờ gọi `/auth/refresh` hay `/auth/logout`**. Lý do: cookie `sl_refresh` trên trình duyệt là của chính admin.

- Gọi `/auth/refresh` sẽ trả về phiên của **admin**, khiến tab âm thầm đổi sang danh tính khác.
- Gọi `/auth/logout` sẽ **đăng xuất admin**.

&#91;embedded content: luồng đăng nhập hộ · 3 bên, 6 bước\]

Bước 5 là lỗi dễ mắc nhất: cookie trên trình duyệt thuộc về admin, nên tab vào hộ chỉ được dùng Bearer token.

Các bước:

1. **Admin app**: ở trang chi tiết người dùng, hiện nút "Đăng nhập hộ" khi có đủ ba điều kiện:
   - người đang đăng nhập có vai trò `super_admin`;
   - tài khoản đích không có vai trò `super_admin`;
   - tài khoản đích không phải chính mình.
2. Bấm nút thì hiện hộp xác nhận, nêu email của tài khoản đích, rồi gọi `POST /api/v1/admin/users/{id}/impersonate` bằng token của admin.
3. Mở tab mới theo vai trò của tài khoản đích:
   - **Khách hàng** (`roles` chỉ có `customer`): mở Storefront.
   - **Nhân viên**: mở Admin app.
4. Chuyển token sang tab mới qua **URL fragment**, ví dụ `/impersonate#token=<accessToken>`. Fragment không được gửi lên server nên không lọt vào log hay header `Referer`.
5. Trang `/impersonate` của app đích làm ba việc:
   - đọc token rồi xóa fragment ngay bằng `history.replaceState`;
   - lưu token vào bộ nhớ, hoặc `sessionStorage` nếu cần giữ qua F5. Không dùng `localStorage` vì nó chia sẻ giữa các tab;
   - gắn `Authorization: Bearer <token>` cho mọi request.
6. Mọi request của tab vào hộ đi thẳng bằng Bearer token. Khi gặp `401`, hoặc khi đến mốc `expiresIn` (15 phút), thì:
   - **không refresh**;
   - xóa token đã lưu;
   - báo "Phiên đăng nhập hộ đã hết hạn", kèm nút quay lại Admin để vào hộ lại.
7. Nút **Thoát đăng nhập hộ**: chỉ xóa token đã lưu rồi đóng tab hoặc chuyển về Admin. Không gọi API nào.

Nếu Storefront lấy dữ liệu cá nhân ở phía server (SSR) dựa vào cookie, thì phiên vào hộ không dùng được cách đó vì không có cookie. Các trang này cần gọi API ở phía client bằng Bearer token. Proxy Next.js `/api/v1/*` phải chuyển nguyên header `Authorization` sang backend.

## UI khi đang đăng nhập hộ

Khi `loginVia === "admin"`, mọi trang của tab vào hộ phải hiện một banner cố định. Backend không chặn thao tác nào, nên mọi việc admin làm sẽ ghi nhận như do chính người dùng làm.

- **Banner**: cố định trên đầu trang, màu cảnh báo, không ẩn được. Nội dung mẫu: "Bạn đang đăng nhập hộ **{user.email}**, còn {mm:ss}", kèm nút **Thoát đăng nhập hộ**.
- **Đồng hồ đếm ngược**: tính từ thời điểm nhận response cộng `expiresIn`. Hết giờ thì xử lý như bước 6 ở trên.
- **Tiêu đề tab**: thêm tiền tố `[Đăng nhập hộ]` để admin không nhầm với tab của chính mình.
- **Hỏi lại trước thao tác nhạy cảm**: đặt hàng, hủy đơn, sửa hồ sơ, đổi mật khẩu, bật 2FA. Hộp xác nhận ghi rõ thao tác sẽ thực hiện thay người dùng.
- **Ẩn nút Đăng xuất thường**: thay bằng nút Thoát đăng nhập hộ, vì `/auth/logout` sẽ đăng xuất admin.
- **Không cho "Ghi nhớ đăng nhập"**: không ghi token vào `localStorage` hay cookie.

## Hạn chế và checklist

- Token vào hộ **không thu hồi được** trước khi hết 15 phút. Thoát đăng nhập hộ chỉ xóa token ở phía FE.
- `GET /admin/users` hiện **chỉ liệt kê nhân viên**, chưa có API tìm khách hàng. Muốn vào hộ khách thì admin phải biết sẵn `id`, ví dụ lấy từ trang chi tiết đơn hàng.
- Chưa có nhật ký thao tác xem được trên giao diện. Backend mới ghi log mỗi lần vào hộ (id admin, id tài khoản đích).
- Không vào hộ lồng nhau được: phiên vào hộ không có vai trò `super_admin` nên API impersonate trả `403`.

Checklist cho FE:

- [ ] Thêm `loginVia`, `impersonatorId` vào type `AuthResponse`
- [ ] Admin: nút "Đăng nhập hộ" kèm hộp xác nhận, chỉ hiện đúng điều kiện
- [ ] Trang `/impersonate` ở cả Storefront và Admin: đọc fragment, xóa fragment, lưu token theo tab
- [ ] Tab vào hộ không gọi `/auth/refresh` và `/auth/logout`
- [ ] Banner cố định, đồng hồ đếm ngược, tiền tố tiêu đề tab
- [ ] Xử lý `401` và hết hạn: xóa token, báo hết phiên
- [ ] Hiển thị lỗi theo `code`: `USER_NOT_FOUND`, `CANNOT_IMPERSONATE`, `FORBIDDEN`
- [ ] Kiểm tra proxy Next.js giữ nguyên header `Authorization`
