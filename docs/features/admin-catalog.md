# Quản lý sách trên Admin (Catalog)

## Mục đích

Super Admin và Quản lý sản phẩm tạo, sửa dữ liệu sách theo mô hình **Đầu sách → Ấn bản → SKU**, cùng danh mục, tác giả và
văn bản pháp luật, để đưa sách lên bán trên website. Nghiệp vụ backend xem `docs/features/catalog.md`.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **admin**, phần "Sách" (`lib/modules.ts`, vai trò `super_admin`, `product_manager`). Gõ thẳng URL khi không có
vai trò thì `components/ModuleGate.tsx` hiện "Không có quyền truy cập"; backend vẫn kiểm tra quyền ở từng API.

| Route                     | Màn hình                                       | Component (`features/catalog/`) |
| ------------------------- | ---------------------------------------------- | ------------------------------- |
| `/sach`                   | Danh sách đầu sách: tìm, lọc trạng thái, trang | `BookList`                      |
| `/sach/tao-nhanh`         | **Tạo nhanh**: sách + ấn bản + SKU trong một màn | `QuickBookCreate`               |
| `/sach/tao-moi`           | Tạo đầu sách, xong chuyển sang màn chi tiết    | `BookCreate`, `BookForm`        |
| `/sach/<id>`              | Thông tin chung, ấn bản, SKU                   | `BookEditor`, `EditionCard`     |
| `/sach/danh-muc`          | Cây danh mục                                   | `CategoryManager`               |
| `/sach/tac-gia`           | Tác giả                                        | `AuthorManager`                 |
| `/sach/van-ban-phap-luat` | Văn bản pháp luật                              | `LegalDocumentManager`          |

- **Tạo nhanh sách** (`/sach/tao-nhanh`, nút "Tạo nhanh sách" ở danh sách): một màn gồm 3 phần: (1) tên sách (con trỏ
  vào đây ngay, slug tự sinh), loại sách, tác giả, danh mục; (2) ấn bản: ISBN, số QĐXB, nhà xuất bản (điền sẵn lần nhập
  trước, lưu ở `localStorage`), tên ấn bản, năm (mặc định năm nay), số trang, khối lượng, ảnh bìa; (3) SKU: mã SKU, loại
  bìa, giá bìa, giá bán (tự điền bằng giá bìa khi rời ô giá bìa), thêm SKU bìa cứng nếu có. Ô "Hiển thị và mở bán ngay"
  (mặc định bật) đặt đầu sách "Đang hiển thị" và ấn bản "Đang bán"; bỏ chọn thì cả hai ở "Nháp". Lưu bằng **một request**
  `POST /admin/books/quick` (một transaction: lỗi phần nào cũng không tạo gì), xong mở màn chi tiết để bổ sung mô tả,
  mục lục, SEO. Dùng lại đúng quy tắc của các form riêng lẻ (`quickBookFormSchema` lấy ô từ `bookFormSchema`,
  `editionFormSchema`, `skuCreateFormSchema`) nên ISBN, giá, mã SKU kiểm tra giống nhau; chặn trùng loại bìa và mã SKU.
  **Tạo ngay tác giả/danh mục còn thiếu** ngay trong form (nút "Tạo mới “…”" ở ô tác giả, ô "Thêm danh mục" ở cấp gốc).
- **Tái bản**: "Thêm ấn bản" ở màn chi tiết điền sẵn từ ấn bản mới nhất (nhà xuất bản, khổ, số trang, khối lượng, văn bản
  pháp luật, năm nay, trạng thái nháp), chỉ cần nhập ISBN, số QĐXB, tên ấn bản và ảnh bìa (`newEditionFormFrom`).
- **Đưa một cuốn sách lên bán**: tạo danh mục/tác giả/văn bản (nếu chưa có) → tạo đầu sách → thêm ấn bản (ISBN, số
  QĐXB) → thêm SKU (loại bìa, giá) → đặt đầu sách "Đang hiển thị", ấn bản "Đang bán". Sách có hàng khi phiếu nhập kho
  được duyệt (phần Kho, `admin-inventory.md`).
- **Không xóa đầu sách/ấn bản/SKU** (backend không có API, đơn cũ còn tham chiếu SKU): gỡ đầu sách bằng trạng thái
  "Ẩn", ấn bản bằng "Ngừng bán". Danh mục, tác giả, văn bản pháp luật xóa được (xóa mềm), có bước xác nhận
  (`components/ConfirmButton.tsx`).
- **Slug** tự gợi ý từ tên (`slugify` trong `@slvn/utils`) cho đến khi người dùng sửa ô slug. Khi sửa sách đã có,
  form cảnh báo đổi slug là đổi URL `/sach/<slug>` đang public.
- **Ấn bản**: ấn bản đầu tiên tự là mới nhất; ấn bản cũ có nút "Đặt làm ấn bản mới nhất". ISBN-13 kiểm tra số kiểm
  tra ngay trên form và gửi dạng 13 số liền.
- **SKU**: mỗi ấn bản một SKU mỗi loại bìa, nên form chỉ cho chọn loại bìa chưa có. Giá là số nguyên VNĐ, giá bán
  không lớn hơn giá bìa. Mã SKU tự chuyển chữ in hoa. Cột "Kho" chỉ hiển thị `inStock`.
- **Ảnh bìa**: chọn file thì upload thẳng lên Cloudinary bằng chữ ký của backend (`lib/image-upload.ts`, tối đa 10 MB),
  hoặc dán link ảnh. Chỉ hiện ảnh xem trước khi link là URL http/https đầy đủ.
- **Chọn tác giả / văn bản pháp luật** (`ReferencePicker`): tìm theo từ khóa, hiện 20 kết quả đầu, mục đã chọn hiện
  thành thẻ có nút bỏ.
- Các API sửa đầu sách/ấn bản/SKU trả lại cả đầu sách: `use-save-book.ts` thay cache màn chi tiết bằng response và
  làm mới danh sách.

## API backend sử dụng (method, route, mã lỗi được xử lý)

Gọi qua `browserApi()` (Bearer, tự refresh khi 401) và proxy `/api/v1`. Response parse bằng Zod (`schemas.ts`) vì
OpenAPI sinh enum thành `number`; body có enum dùng `@ts-expect-error` kèm lý do (`api.ts`).

| Method              | Route                                                                   | Dùng cho                     |
| ------------------- | ----------------------------------------------------------------------- | ---------------------------- |
| GET                 | `/api/v1/admin/books?Q=&Status=&Page=&Limit=`                           | Danh sách đầu sách           |
| GET / POST / PUT    | `/api/v1/admin/books`, `/api/v1/admin/books/{id}`                       | Xem, tạo, sửa đầu sách       |
| POST                | `/api/v1/admin/books/quick` (khai báo ở `pending-paths.ts`)             | Tạo nhanh sách + ấn bản + SKU |
| POST / PUT          | `/api/v1/admin/books/{id}/editions`, `/api/v1/admin/editions/{id}`      | Thêm, sửa ấn bản             |
| POST                | `/api/v1/admin/editions/{id}/set-latest`                                | Đổi ấn bản mới nhất          |
| POST / PUT          | `/api/v1/admin/editions/{id}/skus`, `/api/v1/admin/skus/{id}`           | Thêm SKU, sửa giá            |
| GET/POST/PUT/DELETE | `/api/v1/admin/categories`, `/authors`, `/legal-documents`              | Danh mục, tác giả, văn bản   |
| POST                | `/api/v1/admin/uploads/cover-signature` (khai báo ở `pending-paths.ts`) | Chữ ký upload ảnh Cloudinary |

Mã lỗi xử lý riêng (`lib/admin-errors.ts`): `SLUG_DUPLICATE`/`SLUG_INVALID` → ô slug; `ISBN_DUPLICATE`/`ISBN_INVALID`
→ ô ISBN; `SKU_CODE_DUPLICATE`/`SKU_CODE_INVALID` → ô mã SKU; `SKU_COVER_DUPLICATE` → ô loại bìa; `PRICE_INVALID` → ô
giá bán; `CATEGORY_PARENT_INVALID` → ô danh mục cha; `VALIDATION_ERROR` → theo `errors` của từng field. Thông báo chung:
`CATEGORY_HAS_CHILDREN`, `REFERENCE_NOT_FOUND`, `UPLOAD_NOT_CONFIGURED`, `FORBIDDEN`; lỗi 5xx kèm `traceId`.

## Cấu hình cần thiết (biến môi trường)

Không có biến mới. Dùng `API_BASE_URL`, `PROXY_SECRET` như `docs/features/admin-shell.md`. Upload ảnh cần backend đã
cấu hình Cloudinary; chưa cấu hình thì báo lỗi và người dùng dán link ảnh.

## Hạn chế / việc còn lại

- **Chưa thử với backend thật**: luồng đã kiểm tra bằng Vitest + MSW. Riêng route chữ ký upload chưa có trong OpenAPI;
  kiểu của `timestamp`, `allowedFormats` chưa ghi trong docs nên FE nhận cả số/chuỗi/mảng.
- Tham số query của danh sách dùng tên theo OpenAPI (`Q`, `Status`, `Page`, `Limit`); ASP.NET bind không phân biệt hoa
  thường nhưng chưa kiểm tra trên backend thật.
- Bộ lọc và trang của danh sách chưa lưu lên URL: quay lại từ màn chi tiết thì về trang 1.
- Mô tả sách nhập dạng HTML thô, chưa có trình soạn thảo; chưa có trường thứ tự tác giả (backend chưa lưu).
- Chưa có concurrency token: hai người sửa cùng đầu sách thì bản lưu sau ghi đè bản trước.
- Đổi slug chưa tự tạo redirect 301 (cần backend hỗ trợ).
- Chưa xóa ảnh cũ trên Cloudinary khi đổi ảnh bìa.
