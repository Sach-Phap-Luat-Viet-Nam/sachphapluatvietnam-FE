# Quản lý nhân viên, khách hàng và đăng nhập hộ (admin + storefront)

## Mục đích

Super Admin quản lý tài khoản trên app **admin**: thêm nhân viên, đổi vai trò, đặt mật khẩu mới, vô hiệu hóa/kích hoạt
lại, đăng xuất hộ, tra cứu khách hàng và **đăng nhập hộ** (fast login) để hỗ trợ người dùng. Đăng nhập hộ khách mở tab
**storefront**, đăng nhập hộ nhân viên mở tab **admin**. Nghiệp vụ và quy tắc backend xem `docs/features/auth.md` của
repo backend; luồng fast login chi tiết ở `fast-login-super-admin.md`.

## Luồng xử lý (màn hình, route, app storefront/admin)

| App        | Route              | Màn hình                                   | Component                                    |
| ---------- | ------------------ | ------------------------------------------ | -------------------------------------------- |
| admin      | `/nhan-vien`       | Danh sách nhân viên kèm mọi thao tác       | `features/users/UserList`, `UserForms`       |
| admin      | `/khach-hang`      | Danh sách khách hàng                       | `features/users/CustomerList`                |
| admin      | `/khach-hang/[id]` | Chi tiết khách: hồ sơ, sổ địa chỉ, hóa đơn | `features/users/CustomerDetail`              |
| admin      | `/dang-nhap-ho`    | Nhận phiên đăng nhập hộ nhân viên          | `features/users/AcceptImpersonation`         |
| storefront | `/dang-nhap-ho`    | Nhận phiên đăng nhập hộ khách              | `features/impersonation/AcceptImpersonation` |

Hai phần "Nhân viên", "Khách hàng" chỉ dành cho `super_admin` (`lib/modules.ts`, policy `users_admin`). Gõ thẳng URL khi
không có vai trò thì `components/ModuleGate.tsx` hiện "Không có quyền truy cập".

- **Nhân viên và Khách hàng cùng một giao diện** (`UserCard`, `AccountActions`): cùng đầu trang, ô tìm (`UserSearch`),
  danh sách thẻ, phân trang và thanh thao tác. Chỉ khác ở những chỗ khách hàng không có:
  - Nhân viên: nhãn "Chưa bật/Đã bật 2FA", dòng "Vai trò" (mỗi vai trò một nhãn), nút Đổi vai trò, nút "Thêm nhân viên".
  - Khách hàng: số điện thoại cạnh email, nút "Xem chi tiết" (tên khách cũng là link tới trang chi tiết).
  - Mọi dòng: tên, nhãn "Bạn" (chính mình), "Hoạt động" hoặc "Đã vô hiệu hóa", email. Tìm theo email, họ tên hoặc số
    điện thoại (`q`, bấm Tìm mới gọi API).
- **Thanh thao tác** chia 3 nhóm, màu nút theo mức độ (`AccountActions.tsx`, kiểu nút ở `@slvn/ui`):
  - Bên trái, nút chính: **Đăng nhập hộ** (`primary`, xanh navy đặc).
  - Ở giữa, quản lý tài khoản: Đổi vai trò, Đặt mật khẩu, Xem chi tiết (`outline`, viền xám).
  - Đẩy sang phải, thao tác nhạy cảm: Đăng xuất hộ (`outline`), **Vô hiệu hóa** (`danger-outline`, viền đỏ) hoặc
    **Kích hoạt lại** (`success-outline`, viền xanh lá).
  - Mỗi nút có icon. Kết quả và lỗi hiện ngay dưới thanh nút của dòng đó; form Đổi vai trò / Đặt mật khẩu mở ngay dưới
    thanh nút, mở form này thì đóng form kia. Trang chi tiết khách dùng đúng thanh nút này.
- **Thêm nhân viên**: email, họ tên, mật khẩu tạm (≥ 8 ký tự), ít nhất một vai trò nhân viên. Nhân viên phải tự bật 2FA ở
  lần đăng nhập đầu; Super Admin tự báo mật khẩu tạm. Email trùng (`EMAIL_TAKEN`) hiện ngay ở ô email.
- **Chỉ thao tác tài khoản dưới cấp** (`canManage`): Đổi vai trò, Đặt mật khẩu, Vô hiệu hóa, Đăng nhập hộ không hiện với
  chính mình và Super Admin khác (Super Admin chỉ có 1–2 tài khoản, quản lý ngoài giao diện); backend vẫn kiểm tra và trả
  `CANNOT_MANAGE_USER`. "Đăng xuất hộ" không hiện với chính mình.
- **Đổi vai trò**: tích chọn vai trò nhân viên, gửi danh sách đầy đủ (`PUT .../roles`). Ô **Tất cả** ở đầu danh sách tích
  hoặc bỏ tích mọi vai trò có thể cấp (không gồm Super Admin), hiện dấu "–" khi mới tích một phần và tự cập nhật khi tích
  lẻ; có cả ở form "Thêm nhân viên". Vai trò ngoài danh sách nhân viên (ví dụ `customer`) được giữ nguyên
  (`toSetRolesBody`).
- **Đặt mật khẩu**: mật khẩu mới 8–128 ký tự. Backend mở khóa nếu đang tạm khóa do sai mật khẩu và đăng xuất mọi thiết bị.
- **Vô hiệu hóa / Kích hoạt lại**: vô hiệu hóa có bước xác nhận; tài khoản bị đăng xuất và không đăng nhập lại được tới
  khi kích hoạt lại. Khác với khóa 15 phút do sai mật khẩu. Tài khoản bị vô hiệu hóa không có nút Đăng nhập hộ.
- **Đăng xuất hộ** (buộc đăng xuất): có bước xác nhận ("Buộc … đăng xuất khỏi mọi thiết bị ngay lập tức?"). Backend kết
  thúc mọi phiên **ngay** (access token cũng bị từ chối, không chờ 15 phút) và bắn Pusher để thiết bị đang mở hiện thông
  báo (`session-realtime.md`). Thông báo thành công nêu số phiên đã kết thúc.
- **Khách hàng**: danh sách mới đăng ký trước; trang chi tiết có thêm hồ sơ, sổ địa chỉ, thông tin xuất hóa đơn.
- Sau mỗi thao tác ghi, danh sách được tải lại (`invalidateQueries`).

### Đăng nhập hộ

1. Bấm "Đăng nhập hộ" → xác nhận. Tab mới được mở **ngay khi bấm** (trước khi gọi API) để trình duyệt không chặn popup;
   bị chặn thì báo lỗi và không gọi API. Đặt `tab.opener = null` (`features/users/impersonation.ts`).
2. Gọi `POST /admin/users/{id}/impersonate`, chuyển tab tới `<app>/dang-nhap-ho#session=<base64url>`. App đích: chỉ có
   vai trò `customer` → `NEXT_PUBLIC_STOREFRONT_URL`; còn lại → origin của admin.
3. Trang `/dang-nhap-ho` (`acceptImpersonationFromLocation` của `@slvn/auth`) đọc fragment, xóa ngay khỏi URL, lưu phiên
   vào `sessionStorage` của tab rồi chuyển tới Tổng quan (admin) hoặc `/tai-khoan` (storefront).

Phiên đăng nhập hộ trong `@slvn/auth` (`session.ts`):

- `SessionState` có `impersonation: { impersonatorId, expiresAt }`. Không ghi cờ `slvn:has-session` vào `localStorage`
  nên tab của chính admin không bị ảnh hưởng; F5 khôi phục từ `sessionStorage`.
- Không bao giờ gọi `/auth/refresh` hay `/auth/logout` (cookie `sl_refresh` là của admin). Gặp 401 hoặc hết `expiresIn`
  thì kết thúc (`impersonationEnded: "expired"`); `logout()` chỉ xóa token ở tab (`"exited"`).
- Admin: banner cố định có đồng hồ `mm:ss` và nút "Thoát đăng nhập hộ", tiêu đề tab có tiền tố `[Đăng nhập hộ]`, nút
  Đăng xuất đổi thành "Thoát đăng nhập hộ". Nhân viên chưa bật 2FA vẫn vào được (token đã mang `amr=mfa`). Kết thúc phiên
  thì hiện màn "Phiên đăng nhập hộ đã hết hạn / Đã thoát" kèm nút về trang quản trị (tải lại, dùng phiên của chính admin).
- Storefront: banner tương tự trên Header; kết thúc thì banner báo có thể đóng tab.

### Đăng nhập theo app

`login(values, portal)` gửi `portal` (`storefront` mặc định, admin gửi `admin`). Backend từ chối Super Admin ở storefront
với `SUPER_ADMIN_PORTAL_FORBIDDEN`.

## API backend sử dụng (method, route, mã lỗi được xử lý)

Đều cần Bearer của Super Admin đã qua 2FA. Response parse bằng Zod (`features/users/schemas.ts`).

| Method | Route                                       | Body / kết quả                               |
| ------ | ------------------------------------------- | -------------------------------------------- |
| GET    | `/admin/users?Q=&Page=&Limit=`              | Phân trang `UserResponse`, chỉ nhân viên     |
| POST   | `/admin/users`                              | `{email, fullName, password, roles[]}` → 201 |
| PUT    | `/admin/users/{id}/roles`                   | `{roles[]}` → `UserResponse`                 |
| PUT    | `/admin/users/{id}/password`                | `{newPassword}` → 204                        |
| POST   | `/admin/users/{id}/deactivate`, `/activate` | → `UserResponse` (`isActive`)                |
| POST   | `/admin/users/{id}/logout`                  | → `{revokedSessions}`                        |
| POST   | `/admin/users/{id}/impersonate`             | → `AuthResponse` (`loginVia: "admin"`)       |
| GET    | `/admin/customers?Q=&Page=&Limit=`          | Phân trang `UserResponse`, chỉ khách hàng    |
| GET    | `/admin/customers/{id}`                     | `{account, addresses[], invoiceInfo}`        |

Mã lỗi có câu chữ riêng (`lib/admin-errors.ts`): `EMAIL_TAKEN`, `USER_NOT_FOUND`, `CANNOT_MANAGE_USER`, `ROLE_INVALID`,
`CANNOT_IMPERSONATE`, `ACCOUNT_DISABLED`; ở form đăng nhập: `ACCOUNT_DISABLED`, `SUPER_ADMIN_PORTAL_FORBIDDEN`. Lỗi
`VALIDATION_ERROR` hiện đúng ô.

## Cấu hình cần thiết (biến môi trường)

- App admin: `NEXT_PUBLIC_STOREFRONT_URL` (gốc URL storefront; có `/` cuối cũng được). Biến `NEXT_PUBLIC_*` được **nhúng
  vào bản build**, nên thêm hoặc đổi giá trị xong phải **Redeploy** admin (bỏ chọn dùng build cache), nếu không bản đang
  chạy vẫn là bản cũ và nút đăng nhập hộ khách báo chưa cấu hình. Chỉ cần đặt ở project admin trên Vercel (Production);
  backend trên Render không dùng biến này.

## Hạn chế / việc còn lại

- Chưa hỏi lại trước thao tác nhạy cảm trong tab đăng nhập hộ (đặt hàng, hủy đơn, sửa hồ sơ); mới có banner cố định.
- Token đăng nhập hộ không thu hồi riêng được trước 15 phút, nhưng chết ngay khi chính chủ đăng nhập nơi khác hoặc bị buộc
  đăng xuất (cùng `sessionVersion`); Thoát chỉ xóa token ở tab.
- Chi tiết khách chưa có lịch sử đơn hàng; danh sách chưa lọc theo vai trò/trạng thái.
- Chưa có nhật ký thao tác xem được trên giao diện (backend mới ghi log).
- Chưa thử end-to-end trên trình duyệt với backend thật; đã kiểm tra bằng Vitest + MSW và test e2e của backend.

## Kiểm tra

Unit test: schema form, chuẩn hóa body, giữ vai trò ngoài danh sách nhân viên, `canManage`, `isActive` thiếu thì mặc
định `true`, chọn app đích khi đăng nhập hộ, link fragment, phiên đăng nhập hộ trong `@slvn/auth`. Component test (MSW):
danh sách và thao tác bị ẩn với chính mình và Super Admin, tìm kiếm, thêm nhân viên, đổi vai trò, đặt mật khẩu, vô hiệu
hóa rồi kích hoạt lại, đăng xuất hộ, chi tiết khách, banner đăng nhập hộ.
