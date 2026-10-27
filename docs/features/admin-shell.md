# Khung trang quản trị và đăng nhập nhân viên (admin)

## Mục đích

Nhân viên đăng nhập vào app **admin** (email, mật khẩu, mã 6 số), bật xác thực 2 lớp (bắt buộc với Super Admin ở lần đăng nhập đầu, nhân viên khác tự chọn), rồi vào khung
quản trị có menu theo vai trò. Đây là nền cho các màn nghiệp vụ: Sách, Nội dung (popup), Kho, Đơn hàng, Nhân viên và
Khách hàng.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **admin**, cổng 3001. Theme sáng mặc định của `@slvn/ui`. Mọi trang `noindex`, `robots.txt` chặn toàn bộ.

| Route                   | Màn hình                                       | Điều kiện vào                                       |
| ----------------------- | ---------------------------------------------- | --------------------------------------------------- |
| `/dang-nhap`            | Đăng nhập (`features/auth/LoginForm.tsx`)      | Không                                               |
| `/xac-thuc-hai-lop`     | Bật 2FA (`features/auth/TwoFactorSetupScreen`) | Nhân viên chưa bật 2FA (`twoFactorEnabled != true`) |
| `/` (nhóm `(quan-tri)`) | Tổng quan (`features/dashboard`)               | Nhân viên (Super Admin phải đã bật 2FA)             |

- **Phiên** dùng chung package `@slvn/auth` với storefront (access token trong bộ nhớ, cookie `sl_refresh`, refresh
  một luồng), xem `docs/features/auth-login.md`.
- **Chặn trang ở client** (`components/SessionGate.tsx`, quyết định ở `lib/session-gate.ts`): cookie `sl_refresh` chỉ
  gửi tới `/api/v1/auth` nên server không biết phiên.
  - Chưa đăng nhập: chuyển về `/dang-nhap?next=<trang đang mở>`.
  - Tài khoản chỉ có vai trò `customer`: hiện "Không có quyền truy cập" kèm nút Đăng xuất.
  - Super Admin chưa bật 2FA (`requiresTwoFactorSetup = true`): chuyển sang `/xac-thuc-hai-lop`.
  - Nhân viên khác chưa bật 2FA vẫn vào trang quản trị bình thường. Sidebar có link "Bật xác thực 2 lớp" (ẩn khi đã bật
    hoặc đang đăng nhập hộ); màn bật 2FA lúc này ghi rõ không bắt buộc và có link "Để sau, quay lại trang quản trị"
    thay cho nút Đăng xuất.
  - Đã bật 2FA thì không vào lại màn này được.
- **Giao diện đăng nhập / bật 2FA** (`components/AuthLayout.tsx`): desktop chia hai cột, bên trái là khối thương hiệu navy
  kèm 3 ghi chú bảo mật (xác thực 2 lớp, phiên 12 giờ, chỉ tài khoản do Super Admin cấp), bên phải là thẻ form; mobile chỉ
  còn tên thương hiệu và thẻ form. Ô email/mật khẩu có icon, ô mật khẩu báo "Đang bật Caps Lock", nút gửi có vòng xoay
  khi chờ. Bước nhập mã có nhãn "Bước 2/2 · Xác thực 2 lớp".
- **Ô mã 6 số** (`features/auth/CodeForm.tsx`, dùng cho bước đăng nhập 2FA và màn bật 2FA): chỉ giữ chữ số (dán
  `123 456` vẫn được), đủ 6 số thì tự gửi (không gửi trùng khi đang chờ); nút "Xác nhận" vẫn còn.
- **Đăng nhập**: không có "Giữ đăng nhập 30 ngày" (máy có thể dùng chung), luôn gửi `rememberMe = false` (phiên 12
  giờ). Tài khoản khách hàng bị từ chối và đăng xuất ngay để không để lại cookie trên domain admin.
- **Bật 2FA**: bấm "Tạo mã QR" mới gọi `/auth/2fa/setup` (mỗi lần gọi là một khóa mới, nên không tự gọi khi tải
  trang). Hiện QR (`qrcode.react`) và khóa chia nhóm 4 ký tự để nhập tay. Nhập mã 6 số, gọi `/auth/2fa/enable`, thay
  bằng phiên mới đã qua 2FA và chuyển về Tổng quan.
- **Menu theo vai trò** (`lib/modules.ts`), đúng bảng quyền trong `docs/api_reference.md`:

  | Phần       | Vai trò                                                          | Trạng thái                      |
  | ---------- | ---------------------------------------------------------------- | ------------------------------- |
  | Tổng quan  | Mọi nhân viên                                                    | Đã có                           |
  | Sách       | `super_admin`, `product_manager`                                 | Đã có (`admin-catalog.md`)      |
  | Nội dung   | `super_admin`, `marketing`                                       | Đã có: popup (`admin-popup.md`) |
  | Kho        | `super_admin`, `warehouse_keeper`                                | Đã có (`admin-inventory.md`)    |
  | Đơn hàng   | `super_admin`, `order_manager`, `customer_service`, `accountant` | Đã có (`admin-orders.md`)       |
  | Nhân viên  | `super_admin`                                                    | Đã có (`admin-users.md`)        |
  | Khách hàng | `super_admin`                                                    | Đã có (`admin-users.md`)        |

  Phần chưa làm hiện nhãn "Sắp có" và không có link, tránh dẫn tới trang 404. Làm xong màn nào thì đổi `ready: true`.
  Gõ thẳng URL của phần không được giao thì `components/ModuleGate.tsx` (đặt ở `layout.tsx` của từng phần) hiện "Không
  có quyền truy cập".

- Mobile: sidebar thành thanh trên cùng có nút Mở/Đóng menu.

## API backend sử dụng (method, route, mã lỗi được xử lý)

| Method | Route                     | Dùng cho                      | Mã lỗi xử lý riêng                                            |
| ------ | ------------------------- | ----------------------------- | ------------------------------------------------------------- |
| POST   | `/api/v1/auth/login`      | Đăng nhập                     | `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, lỗi theo field       |
| POST   | `/api/v1/auth/login/2fa`  | Bước nhập mã 6 số             | `OTP_INVALID` (ở ô nhập), `TWO_FACTOR_TOKEN_INVALID`          |
| POST   | `/api/v1/auth/2fa/setup`  | Lấy khóa và URI cho QR        | `401` → refresh một lần rồi gọi lại                           |
| POST   | `/api/v1/auth/2fa/enable` | Bật 2FA                       | `OTP_INVALID` (ở ô nhập), `401` → refresh một lần rồi gọi lại |
| POST   | `/api/v1/auth/refresh`    | Khôi phục phiên khi tải trang | `INVALID_REFRESH_TOKEN` → về đăng nhập                        |
| POST   | `/api/v1/auth/logout`     | Đăng xuất                     | 401 coi như đã đăng xuất                                      |

- `browserApi()` không tự refresh với `/auth/*`. Riêng setup/enable dùng Bearer và mã sai trả 400, nên 401 chỉ có thể
  là access token hết 15 phút trong lúc quét QR; `features/auth/two-factor-setup.ts` tự refresh rồi gửi lại.

## Cấu hình cần thiết (biến môi trường)

Giống storefront: `API_BASE_URL` (bắt buộc), `PROXY_SECRET` (trên Vercel). Xem `apps/admin/.env.example` và
`docs/deploy-vercel.md`.

## Hạn chế / việc còn lại

- **Chưa thử với tài khoản nhân viên thật** trên backend. Luồng đã kiểm tra bằng test Vitest + MSW và Playwright giả lập
  API (`apps/admin/e2e/admin.spec.ts`).
- Ở **local**, storefront (3000) và admin (3001) dùng chung cookie của `localhost`: đăng nhập app này sẽ thay phiên của
  app kia. Trên Vercel hai domain tách riêng nên không bị.
- Kho: `admin-inventory.md`; Đơn hàng: `admin-orders.md`; Nhân viên, Khách hàng và đăng nhập hộ: `admin-users.md`.
- Chưa có màn đổi mật khẩu (`/auth/password/change`); nhân viên mới dùng mật khẩu tạm do Super Admin đặt.
- Chưa đồng bộ đăng xuất giữa các tab.
