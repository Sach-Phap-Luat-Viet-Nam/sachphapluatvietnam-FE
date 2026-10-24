# Khung trang quản trị và đăng nhập nhân viên (admin)

## Mục đích

Nhân viên đăng nhập vào app **admin** (email, mật khẩu, mã 6 số), bật xác thực 2 lớp ở lần đăng nhập đầu, rồi vào khung
quản trị có menu theo vai trò. Đây là nền cho các màn nghiệp vụ (Sách, Kho, Đơn hàng, Nhân viên) làm ở các đợt sau.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **admin**, cổng 3001. Theme sáng mặc định của `@slvn/ui`. Mọi trang `noindex`, `robots.txt` chặn toàn bộ.

| Route                   | Màn hình                                       | Điều kiện vào                                |
| ----------------------- | ---------------------------------------------- | -------------------------------------------- |
| `/dang-nhap`            | Đăng nhập (`features/auth/LoginForm.tsx`)      | Không                                        |
| `/xac-thuc-hai-lop`     | Bật 2FA (`features/auth/TwoFactorSetupScreen`) | Nhân viên có `requiresTwoFactorSetup = true` |
| `/` (nhóm `(quan-tri)`) | Tổng quan (`features/dashboard`)               | Nhân viên đã bật 2FA                         |

- **Phiên** dùng chung package `@slvn/auth` với storefront (access token trong bộ nhớ, cookie `sl_refresh`, refresh
  một luồng), xem `docs/features/auth-login.md`.
- **Chặn trang ở client** (`components/SessionGate.tsx`, quyết định ở `lib/session-gate.ts`): cookie `sl_refresh` chỉ
  gửi tới `/api/v1/auth` nên server không biết phiên.
  - Chưa đăng nhập: chuyển về `/dang-nhap?next=<trang đang mở>`.
  - Tài khoản chỉ có vai trò `customer`: hiện "Không có quyền truy cập" kèm nút Đăng xuất.
  - Nhân viên chưa bật 2FA: chuyển sang `/xac-thuc-hai-lop`. Đã bật thì không vào lại màn này được.
- **Đăng nhập**: không có "Giữ đăng nhập 30 ngày" (máy có thể dùng chung), luôn gửi `rememberMe = false` (phiên 12
  giờ). Tài khoản khách hàng bị từ chối và đăng xuất ngay để không để lại cookie trên domain admin.
- **Bật 2FA**: bấm "Tạo mã QR" mới gọi `/auth/2fa/setup` (mỗi lần gọi là một khóa mới, nên không tự gọi khi tải
  trang). Hiện QR (`qrcode.react`) và khóa chia nhóm 4 ký tự để nhập tay. Nhập mã 6 số, gọi `/auth/2fa/enable`, thay
  bằng phiên mới đã qua 2FA và chuyển về Tổng quan.
- **Menu theo vai trò** (`lib/modules.ts`), đúng bảng quyền trong `docs/api_reference.md`:

  | Phần      | Vai trò                                                          | Trạng thái |
  | --------- | ---------------------------------------------------------------- | ---------- |
  | Tổng quan | Mọi nhân viên                                                    | Đã có      |
  | Sách      | `super_admin`, `product_manager`                                 | Sắp có     |
  | Kho       | `super_admin`, `warehouse_keeper`                                | Sắp có     |
  | Đơn hàng  | `super_admin`, `order_manager`, `customer_service`, `accountant` | Sắp có     |
  | Nhân viên | `super_admin`                                                    | Sắp có     |

  Phần chưa làm hiện nhãn "Sắp có" và không có link, tránh dẫn tới trang 404. Làm xong màn nào thì đổi `ready: true`.

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
- Chưa có màn nghiệp vụ nào: Sách, Kho, Đơn hàng, Nhân viên (kèm nút Đăng nhập hộ, `fast-login-super-admin.md`).
- Chưa có trang `/impersonate` cho phiên đăng nhập hộ; `@slvn/auth` chưa đọc `loginVia`, `impersonatorId`.
- Chưa có màn đổi mật khẩu (`/auth/password/change`); nhân viên mới dùng mật khẩu tạm do Super Admin đặt.
- Chưa đồng bộ đăng xuất giữa các tab.
