# Header, danh sách sách và đăng nhập — giao diện xem trước

## Mục đích

Dựng giao diện storefront tiếng Việt, responsive, dùng theme navy và đỏ đô của `@slvn/ui`.

## Luồng xử lý

- `/` chuyển tới `/sach`. Trang danh sách render trên server, có tìm theo tên, lọc danh mục, khoảng giá, loại sách, loại bìa, sắp xếp và phân trang 8 sách/trang.
- Bộ lọc nằm trong query string; đổi bộ lọc đặt lại trang. Xem nhanh mở dialog, đóng bằng nút hoặc Escape.
- Header có form tìm kiếm, danh mục mobile, liên kết đăng nhập. Chưa hiển thị giỏ vì chưa tích hợp giỏ hàng.
- `/dang-nhap` có React Hook Form + Zod, lỗi theo field, ẩn/hiện mật khẩu và ghi nhớ đăng nhập. Submit hợp lệ chỉ thông báo trạng thái xem trước, không tạo phiên hoặc lưu thông tin.
- Bìa sách là minh họa bằng HTML/Tailwind, không phải ảnh bìa xuất bản.

## API backend sử dụng

Chưa gọi API trong bản giao diện này. Dữ liệu trình bày nằm tại `features/catalog/demo-books.ts`; không giả lập đăng nhập thành công.

Khi tích hợp, dùng `@slvn/api-client` với `GET /api/v1/books`, `GET /api/v1/categories`, `POST /api/v1/auth/login` và luồng 2FA/refresh theo `docs/api_reference.md`. Giá và tồn kho chính thức lấy từ backend.

## Cấu hình cần thiết

Không cần biến môi trường cho bản xem trước. Chạy `pnpm --filter @slvn/storefront dev` ở cổng 3000.

## Hạn chế / việc còn lại

- Dữ liệu sách, năm và giá đều là minh họa. Chưa có tìm ISBN, tồn kho, đặt mua hoặc chi tiết sách đầy đủ.
- Bộ lọc loại sách, bìa và sort dựa trên những lựa chọn API đang hỗ trợ; dữ liệu xem trước chưa lấy từ backend. Không dùng số lượng minh họa làm tổng danh mục thực tế.
- Chưa kết nối auth, 2FA, refresh một luồng hoặc ghi nhớ phiên. Không có quên mật khẩu/đăng ký vì ngoài phạm vi giao diện hiện tại.
- API reference ghi access token ở memory và refresh token trong cookie HttpOnly; khác mô tả cũ trong SKILL.md, cần theo backend khi tích hợp.
- Chưa dựng app admin.

## Kiểm tra

Unit test cho bộ lọc/phân trang và form đăng nhập. Playwright cho tìm sách, xem nhanh và validation đăng nhập trên desktop/mobile.
