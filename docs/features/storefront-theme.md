# Giao diện sáng/tối của storefront

## Mục đích

Khách chọn giao diện **sáng** hoặc **tối** (mặc định tối). Lựa chọn được nhớ ở trình duyệt và, khi đã đăng nhập, lưu vào tài
khoản để đồng bộ giữa các thiết bị. Chỉ áp dụng cho **storefront**; admin vẫn dùng theme sáng cố định.

## Luồng xử lý (màn hình, route, app storefront/admin)

1. `THEME_INIT_SCRIPT` (inline trong `<head>`, `lib/theme-script.ts`) đọc `localStorage` `slvn:theme` và đặt
   `<html data-theme>` **trước khi vẽ**, nên không nháy tối rồi mới sáng. Không có lựa chọn thì là `dark`. `<html>` có
   `suppressHydrationWarning` vì thuộc tính này do script đặt.
2. CSS (`app/globals.css`): token màu dark nằm trong `@theme`; `:root[data-theme="light"]` ghi đè giá trị cùng tên token
   (ink = nền, ivory = chữ chính, gold đậm hơn để đạt tương phản AA...) nên component không cần biết chế độ. Màu cố định không
   đổi theo chế độ dùng token `cream` (chữ trên nền đỏ đô, nền giấy của bìa sách). `color-scheme` đặt theo chế độ.
3. `ThemeToggle` (Header): đổi giao diện ngay (`applyTheme`: `data-theme`, `meta theme-color`, `localStorage`); đã đăng nhập
   thì gọi `PUT /me/preferences {theme}`. Lỗi lưu tài khoản bị bỏ qua (vẫn đổi và nhớ ở trình duyệt). Phiên đăng nhập hộ
   **không** ghi lên tài khoản của khách.
4. `ThemeSync` (layout), một lần cho mỗi tài khoản đăng nhập: tài khoản đã có `theme` thì áp dụng (thiết bị khác cũng thấy);
   chưa có mà trình duyệt đã chọn thì lưu lên tài khoản.
5. `useTheme()` đọc `data-theme` bằng `useSyncExternalStore`, server render như mặc định.

## API (method, route, request, response, mã lỗi)

| Method | Route             | Ghi chú                                                         |
| ------ | ----------------- | --------------------------------------------------------------- |
| PUT    | `/me/preferences` | `{theme: "dark" \| "light"}`→`{theme}`; thiếu/sai giá trị → 400 |

`UserResponse`/`MeResponse` có `theme` (`null` khi chưa chọn). OpenAPI mô tả enum là số nên FE ép kiểu khi gửi (như
`displayFrequency` ở admin).

## Cấu hình cần thiết

Không có biến môi trường. Backend cần migration `AddUserTheme` (xem `docs/features/auth.md` của backend).

## Thay đổi CSDL (migration liên quan)

Không thuộc FE (cột `auth.users.theme`).

## Hạn chế / việc còn lại

- Chưa theo `prefers-color-scheme` của hệ điều hành: mặc định luôn tối cho tới khi khách chọn.
- Mới kiểm tra bằng mắt trang chủ, tủ sách và đăng nhập (DB dev chưa có sách nên chưa thấy thẻ sách/chi tiết sách/giỏ hàng ở
  chế độ sáng); cần xem lại các trang đó khi có dữ liệu.
- Ảnh popup quảng cáo giữ nguyên ở cả hai chế độ.
