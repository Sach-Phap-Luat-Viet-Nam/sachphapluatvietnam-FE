# Quản lý popup quảng cáo trên Admin

## Mục đích

Super Admin và Marketing tạo, sửa, bật/tắt, xóa popup quảng cáo (ảnh + link) hiển thị trên Storefront theo lịch chạy.
Nghiệp vụ backend xem `docs/features/popup.md`; phía Storefront xem `docs/features/storefront-popup.md`.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **admin**, phần "Nội dung" (`lib/modules.ts`, vai trò `super_admin`, `marketing` theo policy `content_admin`).
Gõ thẳng URL khi không có vai trò thì `components/ModuleGate.tsx` hiện "Không có quyền truy cập".

| Route                     | Màn hình                                        | Component (`features/popup/`) |
| ------------------------- | ----------------------------------------------- | ----------------------------- |
| `/noi-dung/popup`         | Danh sách popup (theo ưu tiên), trạng thái, xóa | `PopupList`                   |
| `/noi-dung/popup/tao-moi` | Tạo popup                                       | `PopupCreate`, `PopupForm`    |
| `/noi-dung/popup/<id>`    | Sửa popup                                       | `PopupEdit`, `PopupForm`      |

- **Ảnh**: chọn file thì upload lên Cloudinary bằng chữ ký `popup-signature` (`lib/image-upload.ts`), hoặc dán link
  http/https.
- **Lịch chạy** nhập bằng ô `datetime-local` theo **giờ Việt Nam**: gửi kèm offset `+07:00`, backend trả UTC rồi FE đổi
  lại giờ Việt Nam (`popup-form.ts`). Kết thúc để trống = chạy đến khi tắt; có thì phải sau thời điểm bắt đầu. Popup mới
  mặc định bắt đầu từ đầu giờ kế tiếp, đang bật, "Một lần mỗi ngày".
- **Link** chỉ nhận đường dẫn trong site (`/khuyen-mai`) hoặc URL `http`/`https`; chặn `javascript:`, `data:`, `//host`,
  `/\host` ngay trên form (cùng quy tắc với backend).
- **Trạng thái** (`status` do backend tính): Đang tắt, Chờ đến lịch, Đang chạy, Đã kết thúc.
- Xóa là xóa mềm, có bước xác nhận. Lưu xong quay về danh sách.

## API backend sử dụng (method, route, mã lỗi được xử lý)

Các route này **chưa có trong OpenAPI**: khai báo ở `packages/api-client/src/pending-paths.ts`, response parse bằng Zod
(`schemas.ts`). Sinh lại type từ OpenAPI có route này thì xóa khai báo tạm.

| Method | Route                                   | Dùng cho                         |
| ------ | --------------------------------------- | -------------------------------- |
| GET    | `/api/v1/admin/popups?page=&limit=`     | Danh sách                        |
| GET    | `/api/v1/admin/popups/{id}`             | Màn sửa                          |
| POST   | `/api/v1/admin/popups`                  | Tạo                              |
| PUT    | `/api/v1/admin/popups/{id}`             | Sửa                              |
| DELETE | `/api/v1/admin/popups/{id}`             | Xóa mềm                          |
| POST   | `/api/v1/admin/uploads/popup-signature` | Chữ ký upload ảnh lên Cloudinary |

Mã lỗi: `VALIDATION_ERROR` → theo field; `NOT_FOUND` → "Không tìm thấy popup này" (không có nút thử lại);
`UPLOAD_NOT_CONFIGURED` → gợi ý dán link ảnh; `FORBIDDEN` → không có quyền; lỗi 5xx kèm `traceId`.

## Cấu hình cần thiết (biến môi trường)

Không có biến mới. Upload ảnh cần backend đã cấu hình Cloudinary (`docs/features/popup.md`).

## Hạn chế / việc còn lại

- **Chưa thử với backend thật**, chỉ kiểm tra bằng Vitest + MSW.
- Ô `datetime-local` chỉ tới phút: kết thúc lúc `23:59` thay vì `23:59:59`.
- Chưa có xem trước popup như trên website, chưa đếm lượt hiển thị/lượt bấm (backend chưa có).
- Chưa xóa ảnh cũ trên Cloudinary khi đổi/xóa popup.
- Hàm kiểm tra link an toàn đang có hai bản, ở admin (`features/popup/schemas.ts`) và storefront
  (`features/popup/popup.ts`). Nên gom vào `packages/utils` khi sửa lần tới.
