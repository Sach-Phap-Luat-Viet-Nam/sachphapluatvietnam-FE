# Quản lý nhân viên, khách hàng và đăng nhập hộ (admin + storefront)

## Mục đích

Super Admin quản lý tài khoản trong app **admin**: thêm nhân viên, đổi vai trò, tra cứu khách hàng, khóa/mở khóa, đặt
lại mật khẩu, đăng xuất hộ và **đăng nhập hộ** (fast login) để hỗ trợ người dùng. Đăng nhập hộ khách mở tab
**storefront**, đăng nhập hộ nhân viên mở tab **admin**. Contract backend: `docs/features/auth.md` của backend và
`fast-login-super-admin.md`.

## Luồng xử lý (màn hình, route, app storefront/admin)

| App        | Route              | Màn hình                                             | Quyền                  |
| ---------- | ------------------ | ---------------------------------------------------- | ---------------------- |
| admin      | `/nhan-vien`       | Nhân viên (`features/users/StaffList.tsx`)           | `super_admin`          |
| admin      | `/khach-hang`      | Khách hàng (`features/users/CustomerList.tsx`)       | `super_admin`          |
| admin      | `/khach-hang/[id]` | Chi tiết khách (`features/users/CustomerDetail.tsx`) | `super_admin`          |
| admin      | `/dang-nhap-ho`    | Nhận phiên đăng nhập hộ nhân viên                    | Link do Super Admin mở |
| storefront | `/dang-nhap-ho`    | Nhận phiên đăng nhập hộ khách                        | Link do Super Admin mở |

- **Nhân viên**: tìm theo email/họ tên/SĐT, thêm nhân viên (email, họ tên, mật khẩu tạm, vai trò), mở "Quản lý" từng
  dòng để đổi vai trò và làm các thao tác tài khoản. Super Admin không tự bỏ được vai trò Super Admin của mình.
- **Khách hàng**: danh sách mới đăng ký trước, chi tiết có hồ sơ, sổ địa chỉ, thông tin xuất hóa đơn.
- **Thao tác tài khoản** (`features/users/AccountActions.tsx`), dùng chung cho nhân viên và khách:
  - Đăng xuất hộ: mọi tài khoản. Đăng nhập hộ, khóa, mở khóa, đặt lại mật khẩu: chỉ tài khoản dưới cấp (không phải
    chính mình, không có vai trò `super_admin`); nút không hiện với các dòng còn lại.
  - Đăng nhập hộ, đăng xuất hộ, khóa hỏi xác nhận tại chỗ (`ConfirmButton`).
  - Trạng thái: "Hoạt động", "Đã khóa" (Super Admin khóa), "Tạm khóa đến …" (sai mật khẩu 5 lần).
- **Đăng nhập hộ** (`features/users/impersonation.ts`):
  1. Mở tab trống ngay khi bấm xác nhận (trước khi gọi API) để trình duyệt không chặn popup; bị chặn thì báo lỗi và
     không gọi API. Đặt `tab.opener = null`.
  2. Gọi `POST /admin/users/{id}/impersonate`, chuyển tab tới `<app>/dang-nhap-ho#session=<base64url>`. App đích:
     chỉ có vai trò `customer` → `NEXT_PUBLIC_STOREFRONT_URL`; còn lại → origin của admin.
  3. Trang `/dang-nhap-ho` (`acceptImpersonationFromLocation` của `@slvn/auth`) đọc fragment, xóa ngay khỏi URL, lưu
     phiên vào `sessionStorage` của tab rồi chuyển tới Tổng quan (admin) hoặc `/tai-khoan` (storefront).
- **Phiên đăng nhập hộ trong `@slvn/auth`** (`session.ts`):
  - `SessionState` có `impersonation: { impersonatorId, expiresAt }`; không ghi cờ `slvn:has-session` vào
    `localStorage` nên tab của chính admin không bị ảnh hưởng. F5 khôi phục từ `sessionStorage`.
  - Không bao giờ gọi `/auth/refresh` hay `/auth/logout` (cookie `sl_refresh` là của admin). Gặp 401 hoặc hết
    `expiresIn` thì kết thúc phiên (`impersonationEnded: "expired"`); `logout()` chỉ xóa token (`"exited"`).
  - Admin: banner cố định có đồng hồ `mm:ss` và nút Thoát, tiêu đề tab có tiền tố `[Đăng nhập hộ]`, nút Đăng xuất đổi
    thành "Thoát đăng nhập hộ". Nhân viên chưa bật 2FA vẫn vào được (token đã mang `amr=mfa`). Kết thúc phiên thì hiện
    màn "Phiên đăng nhập hộ đã hết hạn / Đã thoát" kèm nút về trang quản trị (tải lại để dùng phiên của chính admin).
  - Storefront: banner tương tự trên Header; kết thúc thì banner báo có thể đóng tab.
- **Đăng nhập theo app**: `login(values, portal)` gửi `portal` (`storefront` mặc định, admin gửi `admin`). Backend từ
  chối Super Admin ở storefront với `SUPER_ADMIN_PORTAL_FORBIDDEN`.

## API backend sử dụng (method, route, mã lỗi được xử lý)

| Method | Route                                     | Dùng cho            |
| ------ | ----------------------------------------- | ------------------- |
| GET    | `/api/v1/admin/users?Q=&Page=&Limit=`     | Danh sách nhân viên |
| POST   | `/api/v1/admin/users`                     | Thêm nhân viên      |
| PUT    | `/api/v1/admin/users/{id}/roles`          | Đổi vai trò         |
| POST   | `/api/v1/admin/users/{id}/lock`           | Khóa                |
| POST   | `/api/v1/admin/users/{id}/unlock`         | Mở khóa             |
| POST   | `/api/v1/admin/users/{id}/password/reset` | Đặt mật khẩu tạm    |
| POST   | `/api/v1/admin/users/{id}/logout`         | Đăng xuất hộ        |
| POST   | `/api/v1/admin/users/{id}/impersonate`    | Đăng nhập hộ        |
| GET    | `/api/v1/admin/customers?Q=&Page=&Limit=` | Danh sách khách     |
| GET    | `/api/v1/admin/customers/{id}`            | Chi tiết khách      |

Mã lỗi xử lý riêng: `EMAIL_TAKEN` (ô Email), `CANNOT_REMOVE_OWN_ADMIN`, `CANNOT_MANAGE_USER`, `CANNOT_IMPERSONATE`,
`USER_NOT_FOUND`, `ROLE_INVALID`; ở form đăng nhập: `ACCOUNT_DISABLED`, `SUPER_ADMIN_PORTAL_FORBIDDEN`.

## Cấu hình cần thiết (biến môi trường)

- App admin: `NEXT_PUBLIC_STOREFRONT_URL` (gốc URL storefront, không có `/` cuối). Đọc lúc build nên đổi giá trị
  phải build lại. Thiếu thì nút đăng nhập hộ khách báo chưa cấu hình.

## Hạn chế / việc còn lại

- Chưa hỏi lại trước thao tác nhạy cảm trong tab đăng nhập hộ (đặt hàng, hủy đơn, sửa hồ sơ); mới có banner cố định.
- Token đăng nhập hộ không thu hồi được trước 15 phút; Thoát chỉ xóa token ở tab.
- Chi tiết khách chưa có lịch sử đơn hàng; nhân viên chưa có trang chi tiết riêng.
- Chưa thử end-to-end trên trình duyệt với backend thật; đã kiểm tra bằng Vitest + MSW và test e2e của backend.
