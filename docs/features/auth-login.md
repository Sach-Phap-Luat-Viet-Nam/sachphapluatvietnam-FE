# Đăng ký, đăng nhập, phiên và đăng xuất (storefront)

## Mục đích

Khách tạo tài khoản ở `/dang-ky` (đăng ký xong vào phiên luôn) và đăng nhập bằng email + mật khẩu ở `/dang-nhap`. Tài khoản đã bật xác thực 2 lớp (thường là nhân viên) nhập thêm
mã 6 số. Phiên được giữ khi tải lại trang, Header hiện tên khách và nút Đăng xuất.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **storefront**. Mọi request đi cùng origin qua proxy `/api/v1/*` (`src/proxy.ts`, logic chung ở
`backendProxyTarget` của `@slvn/api-client`) vì cookie `sl_refresh` là `SameSite=Strict` (backend đã bật CORS cho domain FE nhưng
gọi thẳng khác site thì trình duyệt không gửi cookie này) và để backend tính giới hạn tần suất theo IP thật của khách.
Logic phiên, `login`, schema, thông báo lỗi và `safeNextPath` nằm ở package `@slvn/auth` (`packages/auth/src`), dùng
chung với app admin (`docs/features/admin-shell.md`); form giao diện nằm ở `features/auth/` của từng app.

- **Đăng ký** (`features/auth/RegisterForm.tsx`, route `/dang-ky`, `noindex`): họ tên, email, số điện thoại (không bắt
  buộc), mật khẩu 8–128 ký tự và ô nhập lại mật khẩu (chỉ kiểm tra ở FE, không gửi lên). Validate bằng `registerSchema`
  (cùng quy tắc với backend: SĐT `0xxxxxxxxx`/`+84xxxxxxxxx`), gọi `register()` của `@slvn/auth`.
  - Body: email bỏ khoảng trắng và đổi chữ thường, SĐT để trống thì gửi `null` (`toRegisterBody`).
  - Backend trả `201` kèm phiên (access token + cookie `sl_refresh`, phiên 12 giờ như không tích "giữ đăng nhập"):
    `register()` gọi `startSession`, form chuyển tới `?next=` (mặc định `/`). Không cần đăng nhập lại, chưa xác thực
    email/SĐT (chờ module Notification phía backend).
  - Email đã có tài khoản (`EMAIL_TAKEN`, 409) báo ngay ở ô email; lỗi validation của backend đưa vào đúng ô; lỗi khác
    hiện chung ở đầu form (5xx kèm mã tra cứu). Nút khóa trong lúc chờ và lúc chuyển trang để không đăng ký hai lần.
  - `/dang-nhap` và `/dang-ky` có link qua lại, giữ nguyên `?next=`. `safeNextPath` không quay lại hai trang này.
- **Đăng nhập** (`features/auth/LoginForm.tsx`): validate bằng Zod, gọi `/auth/login`.
  - `requiresTwoFactor = false`: lưu phiên, chuyển tới `?next=` (chỉ nhận path nội bộ, xem `packages/auth/src/redirect.ts`), mặc định `/`.
  - `requiresTwoFactor = true`: chuyển sang bước nhập mã (`TwoFactorForm.tsx`), gọi `/auth/login/2fa` với
    `twoFactorToken`. Mã sai thì báo ở ô nhập; `twoFactorToken` quá 5 phút thì quay lại bước mật khẩu kèm thông báo.
    Luôn gửi `trustDevice: false` (`packages/auth/src/login.ts`): chưa có ô "Tin cậy thiết bị này" dù backend đã hỗ trợ
    (cookie `sl_2fa_trust`, xem `docs/features/auth.md`).
  - Nút gửi bị khóa trong lúc chờ và lúc chuyển trang để không gửi trùng.
- **Phiên** (`packages/auth/src/session.ts`):
  - Access token chỉ giữ trong bộ nhớ của tab, không lưu `localStorage`/cookie. Refresh token là cookie HttpOnly
    `sl_refresh` do backend đặt.
  - Trạng thái phiên (`unknown` / `anonymous` / `authenticated`) đọc qua `useSyncExternalStore`.
  - Khi đăng nhập, ghi cờ `slvn:has-session = "1"` vào `localStorage` (chỉ là cờ, không chứa token).
  - **Khôi phục khi tải trang** (`AccountNav` gọi `restoreSession`): chỉ gọi `/auth/refresh` nếu có cờ. Lý do: `/auth/*`
    giới hạn 10 request/phút/IP, khách vãng lai tải lại trang khi lọc/tìm sách sẽ làm hết lượt đăng nhập.
    Refresh trả 401 thì xóa cờ; lỗi mạng/429/5xx thì giữ cờ để lần sau thử lại.
  - **Refresh một luồng**: các lời gọi cùng lúc dùng chung một promise, giữa các tab dùng Web Locks
    (`navigator.locks`). Refresh song song bằng cùng cookie sẽ bị backend coi là dùng lại token và thu hồi mọi phiên.
  - `browserApi()`: client gắn `Authorization: Bearer`, gặp 401 thì refresh một lần rồi gửi lại request. Dùng cho các
    API cần đăng nhập sau này (giỏ, đơn hàng, hồ sơ). `authApi()` dùng cho `/auth/*`, không tự refresh.
- **Header** (`components/AccountNav.tsx`): chưa xác định phiên hoặc chưa đăng nhập thì hiện link Đăng nhập (HTML từ
  server giống client, không xê dịch layout). Đã đăng nhập thì hiện `fullName` và nút Đăng xuất.
- **Đăng xuất**: gọi `/auth/logout`, thành công (hoặc 401) mới xóa phiên ở trình duyệt. Backend lỗi thì giữ phiên và
  báo "Chưa đăng xuất được" để khách thử lại, tránh trường hợp máy dùng chung tưởng đã đăng xuất nhưng cookie còn.

## API backend sử dụng (method, route, mã lỗi được xử lý)

| Method | Route                    | Dùng cho                         | Mã lỗi xử lý riêng                                      |
| ------ | ------------------------ | -------------------------------- | ------------------------------------------------------- |
| POST   | `/api/v1/auth/register`  | Đăng ký tài khoản khách hàng     | `EMAIL_TAKEN` (ở ô email), lỗi theo field               |
| POST   | `/api/v1/auth/login`     | Đăng nhập email + mật khẩu       | `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, lỗi theo field |
| POST   | `/api/v1/auth/login/2fa` | Bước nhập mã 6 số                | `OTP_INVALID` (ở ô nhập), `TWO_FACTOR_TOKEN_INVALID`    |
| POST   | `/api/v1/auth/refresh`   | Khôi phục phiên, refresh khi 401 | `INVALID_REFRESH_TOKEN` (401) → chưa đăng nhập          |
| POST   | `/api/v1/auth/logout`    | Đăng xuất                        | 401 coi như đã đăng xuất                                |

- Thông báo lỗi ở `packages/auth/src/errors.ts`: các mã ở trên có câu chữ riêng, mã khác dùng `title` của `ApiError`,
  lỗi 5xx kèm `traceId`, mất mạng báo "Không kết nối được máy chủ".
- Response parse bằng Zod (`authResponseSchema`) vì type sinh từ OpenAPI để số là `number | string`.

## Cấu hình cần thiết (biến môi trường)

Không thêm biến mới. Dùng `API_BASE_URL` (và `PROXY_SECRET` trên Vercel) cho proxy, xem `docs/deploy-vercel.md`.

## Hạn chế / việc còn lại

- **Chưa kiểm tra với tài khoản thật** việc cookie `sl_refresh` (`Secure`, `Path=/api/v1/auth`) đi qua proxy và được
  trình duyệt lưu ở domain storefront. Mới thử: sai mật khẩu qua proxy trả đúng `401 INVALID_CREDENTIALS`.
- Production cần FE và API **cùng site** vì cookie là `SameSite=Strict` (docs/api_reference.md).
- Gộp giỏ khách sau đăng nhập: giỏ tải lại theo người dùng mới (gửi cả Bearer và cookie `sl_cart`), backend tự gộp, xem
  `docs/features/storefront-ordering.md`.
- Chưa đồng bộ đăng xuất giữa các tab: tab khác vẫn hiện tên đến khi tải lại trang hoặc gặp 401.
- Tài khoản nhân viên chưa bật 2FA (`requiresTwoFactorSetup`) vẫn đăng nhập được ở storefront; màn bật 2FA ở app
  admin (`/xac-thuc-hai-lop`). Riêng Super Admin bị backend từ chối ở storefront (`SUPER_ADMIN_PORTAL_FORBIDDEN`).
- Chưa có quên mật khẩu; chưa xác thực email/SĐT sau khi đăng ký (backend chưa có). Đăng nhập hộ xem `admin-users.md`.
- `/auth/*` giới hạn 10 request/phút/IP: nhiều người đăng ký cùng lúc sau một IP (văn phòng, wifi chung) có thể bị 429.
- Trang `/dang-nhap` chưa tự chuyển đi khi khách đã đăng nhập.
