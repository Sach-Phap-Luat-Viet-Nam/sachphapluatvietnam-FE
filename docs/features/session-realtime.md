# Một nơi đăng nhập và thông báo kết thúc phiên (Pusher)

## Mục đích

Mỗi tài khoản chỉ đăng nhập ở **một nơi**: đăng nhập mới đá phiên cũ. Super Admin "Đăng xuất hộ" là buộc đăng xuất có hiệu
lực ngay. Cả hai trường hợp backend bắn sự kiện Pusher để thiết bị bị đá hiện thông báo thay vì im lặng văng ra. Phần backend
(session_version, JWT, kênh, cấu hình) ở `docs/features/auth.md` của repo backend.

## Luồng xử lý (màn hình, route, app storefront/admin)

1. `SessionRealtime` (client component trong `app/layout.tsx` của **cả storefront và admin**) gọi
   `startSessionRealtime` của `@slvn/auth`. Thiếu `NEXT_PUBLIC_PUSHER_KEY`/`NEXT_PUBLIC_PUSHER_CLUSTER` thì không làm gì.
2. Khi có phiên, nạp lười `pusher-js` (khách vãng lai không tải) và đăng ký kênh riêng `private-user-{id}`. Chữ ký kênh lấy
   bằng `POST /realtime/auth` qua `browserApi()` (có Bearer, tự refresh khi 401), nên chỉ chủ tài khoản nghe được. Đăng
   xuất hoặc đổi tài khoản thì ngắt và kết nối lại kênh mới.
3. Sự kiện `session-ended` `{reason, version}`: `handleSessionEnded` chỉ kết thúc phiên khi `version` **lớn hơn**
   `sessionVersion` của phiên hiện tại (`AuthResponse.sessionVersion`, giữ trong `SessionState`). Thiết bị vừa đăng nhập
   mang đúng version trong sự kiện nên bỏ qua; thiết bị cũ có version thấp hơn nên bị đá.
4. `endSession(reason)` xóa access token và cờ phiên, chuyển `anonymous` kèm `sessionEnded` (`signed_in_elsewhere` |
   `forced_logout`). Tab đăng nhập hộ thì kết thúc như hết hạn (`impersonationEnded: "expired"`).
5. `SessionEndedNotice` (mỗi app một bản, nằm ở layout nên còn hiện sau khi admin bị chuyển về trang đăng nhập) hiện
   `role="alert"` kèm lý do; storefront có link "Đăng nhập lại". Đóng được; đăng nhập lại thì tự ẩn.
6. Không có Pusher hoặc lỡ sự kiện: thiết bị vẫn bị 401 ở lần gọi API kế tiếp, refresh thất bại và chuyển về chưa đăng nhập
   (khi đó không có thông báo vì không biết lý do).

## API (method, route, request, response, mã lỗi)

| Method | Route            | Ghi chú                                                                     |
| ------ | ---------------- | --------------------------------------------------------------------------- |
| POST   | `/realtime/auth` | `{socketId, channelName}` → `{auth}`; 403 kênh của người khác; 503 chưa bật |

`AuthResponse` có thêm `sessionVersion`; `SessionUser.theme` xem `storefront-theme.md`.

## Cấu hình cần thiết

- Vercel (cả `storefront` và `admin`): `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` (đọc lúc build: đặt xong phải
  **Redeploy bỏ build cache**). Key và cluster không phải bí mật. Mẫu ở `.env.example` của hai app.
- Render (backend): `Pusher__AppId`, `Pusher__Key`, `Pusher__Secret` (bí mật), `Pusher__Cluster`. Key/cluster hai bên phải
  cùng một app Pusher.
- Chỉ dùng **private channel** do server bắn; không cần bật client events.

## Thay đổi CSDL (migration liên quan)

Không thuộc FE. Backend: migration `AddUserSessionVersion`; chạy trước khi deploy backend.

## Hạn chế / việc còn lại

- Chưa thử với Pusher thật (môi trường dev không có khóa); logic được kiểm tra bằng Vitest với Pusher giả và test e2e của
  backend với notifier ghi nhận.
- Khi mất kết nối Pusher rồi nối lại, sự kiện bắn trong lúc mất kết nối không được phát lại (chỉ bị 401 ở lần gọi sau).
- Thông báo chỉ hiện ở thiết bị còn mở trang; thiết bị đã đóng tab thì thấy trang đăng nhập khi quay lại.
