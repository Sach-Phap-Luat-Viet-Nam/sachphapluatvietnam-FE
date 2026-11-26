# Quản lý trang tĩnh trên Admin

## Mục đích

Super Admin và Marketing soạn, sửa, xuất bản, xóa các trang tĩnh của Storefront (Điều khoản sử dụng, Chính sách bảo
mật...) bằng trình soạn thảo WYSIWYG (FR-91), không cần deploy lại FE. Nghiệp vụ backend xem BE
`docs/features/static-pages.md`; phía Storefront xem `docs/features/storefront-policies.md`.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **admin**, phần "Nội dung" (`lib/modules.ts`, vai trò `super_admin`, `marketing` theo policy `content_admin`). Phần
này có hai tab (`features/static-pages/ContentTabs.tsx`): "Popup quảng cáo" và "Trang tĩnh".

| Route                          | Màn hình                                       | Component (`features/static-pages/`) |
| ------------------------------ | ---------------------------------------------- | ------------------------------------ |
| `/noi-dung/trang-tinh`         | Danh sách theo đường dẫn, trạng thái, xem, xóa | `StaticPageList`                     |
| `/noi-dung/trang-tinh/tao-moi` | Tạo trang                                      | `StaticPageCreate`, `StaticPageForm` |
| `/noi-dung/trang-tinh/<id>`    | Sửa trang                                      | `StaticPageEdit`, `StaticPageForm`   |

- **Đường dẫn (slug)**: khi tạo mới, tự gợi ý theo tiêu đề cho tới khi người dùng tự sửa ô này; khi sửa trang đã có
  thì không tự đổi. Chỉ nhận chữ thường không dấu, số, gạch nối (cùng quy tắc backend). Storefront hiện chỉ có route cho
  `dieu-khoan-su-dung` và `chinh-sach-bao-mat` (`STOREFRONT_PAGE_SLUGS` trong `static-page-form.ts`): slug khác vẫn lưu
  được nhưng form cảnh báo khách chưa xem được. Đổi slug trang đã có thì cảnh báo link cũ sẽ hỏng.
- **Nội dung**: Tiptap 3 (`RichTextEditor.tsx`). Chỉ bật định dạng mà Storefront giữ khi lọc HTML: đoạn văn, tiêu đề
  mục (`h2`, vào mục lục), tiêu đề phụ (`h3`), đậm/nghiêng/gạch chân, link, danh sách, khối ghi chú (`blockquote`), kẻ
  ngang, hoàn tác/làm lại. Nút "Sửa mã HTML" chuyển sang ô sửa mã; quay lại chế độ soạn thảo thì Tiptap đọc lại HTML và bỏ
  thẻ không hỗ trợ. Link lưu gọn chỉ `href`; Storefront tự gắn `target`/`rel`.
- **Neo mục lục**: extension `HeadingId` giữ `id` của tiêu đề khi mở trang (Tiptap mặc định bỏ). Khi lưu,
  `withHeadingIds` gắn `id` kebab-case cho mọi `<h2>` chưa có (sinh từ chữ trong tiêu đề, trùng thì `-2`, tránh
  `noi-dung`, `bat-dau` của khung trang Storefront). Sửa chữ trong tiêu đề không đổi `id`, nên link `#pham-vi` cũ vẫn chạy.
- **Xuất bản**: bỏ chọn thì Storefront trả 404. Nút "Xem" ở danh sách mở trang trên website (chỉ khi đã xuất bản, slug
  có route, và có `NEXT_PUBLIC_STOREFRONT_URL`). Website cập nhật sau tối đa khoảng 1 phút (cache 60 giây).
- Xóa là xóa hẳn, có bước xác nhận. Lưu xong quay về danh sách.

## API backend sử dụng (method, route, mã lỗi được xử lý)

Các route này **chưa có trong OpenAPI**: khai báo ở `packages/api-client/src/pending-paths.ts`, response parse bằng Zod
(`schemas.ts`).

| Method | Route                      | Dùng cho                                             |
| ------ | -------------------------- | ---------------------------------------------------- |
| GET    | `/api/v1/admin/pages`      | Danh sách (`page`, `limit` = 20), không kèm nội dung |
| GET    | `/api/v1/admin/pages/{id}` | Mở trang để sửa                                      |
| POST   | `/api/v1/admin/pages`      | Tạo trang                                            |
| PUT    | `/api/v1/admin/pages/{id}` | Sửa trang (thay thế toàn bộ)                         |
| DELETE | `/api/v1/admin/pages/{id}` | Xóa trang                                            |

- `SLUG_DUPLICATE` (409): hiện dưới ô "Đường dẫn".
- `VALIDATION_ERROR` (400): lỗi theo field hiện ở từng ô, còn lại ở cuối form.
- `NOT_FOUND` (404) khi mở trang đã bị xóa: "Không tìm thấy trang này, có thể đã bị xóa."

## Cấu hình cần thiết (biến môi trường)

- `NEXT_PUBLIC_STOREFRONT_URL` (đã có, dùng chung với đăng nhập hộ): thiếu thì ẩn nút "Xem".
- Package mới: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm` 3.x (MIT) cho trình soạn thảo WYSIWYG.

## Hạn chế / việc còn lại

- Chưa có xem trước đúng giao diện Storefront trong Admin; xem bằng nút "Xem" sau khi lưu.
- Chưa có lịch sử phiên bản hay khóa khi hai người cùng sửa: người lưu sau ghi đè.
- Chưa chèn ảnh, bảng.
- Trang slug mới cần thêm route bên Storefront mới hiển thị được.
