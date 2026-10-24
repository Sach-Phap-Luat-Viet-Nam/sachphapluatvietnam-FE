# Đăng nhập, phiên và đăng xuất (storefront)

## Mục đích

Khách đăng nhập bằng email + mật khẩu ở `/dang-nhap`. Tài khoản đã bật xác thực 2 lớp (thường là nhân viên) nhập thêm
mã 6 số. Phiên được giữ khi tải lại trang, Header hiện tên khách và nút Đăng xuất.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **storefront**. Mọi request đi cùng origin qua proxy `/api/v1/*` (`src/proxy.ts`, logic chung ở
`backendProxyTarget` của `@slvn/api-client`) vì backend chưa bật CORS và cookie `sl_refresh` là `SameSite=Strict`.
Logic phiên, `login`, schema, thông báo lỗi và `safeNextPath` nằm ở package `@slvn/auth` (`packages/auth/src`), dùng
chung với app admin (`docs/features/admin-shell.md`); form giao diện nằm ở `features/auth/` của từng app.

- **Đăng nhập** (`features/auth/LoginForm.tsx`): validate bằng Zod, gọi `/auth/login`.
  - `requiresTwoFactor = false`: lưu phiên, chuyển tới `?next=` (chỉ nhận path nội bộ, xem `packages/auth/src/redirect.ts`), mặc định `/`.
  - `requiresTwoFactor = true`: chuyển sang bước nhập mã (`TwoFactorForm.tsx`), gọi `/auth/login/2fa` với
    `twoFactorToken`. Mã sai thì báo ở ô nhập; `twoFactorToken` quá 5 phút thì quay lại bước mật khẩu kèm thông báo.
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
- Chưa gọi `GET /api/v1/cart` sau đăng nhập để gộp giỏ khách (chưa có tính năng giỏ).
- Chưa đồng bộ đăng xuất giữa các tab: tab khác vẫn hiện tên đến khi tải lại trang hoặc gặp 401.
- Tài khoản nhân viên chưa bật 2FA (`requiresTwoFactorSetup`) vẫn đăng nhập được ở storefront; màn bật 2FA ở app
  admin (`/xac-thuc-hai-lop`).
- Chưa có trang đăng ký, quên mật khẩu, hồ sơ; đăng nhập hộ xem `admin-users.md`.
- Trang `/dang-nhap` chưa tự chuyển đi khi khách đã đăng nhập.
