# Header, danh sách sách và đăng nhập

## Mục đích

Giao diện storefront tiếng Việt, responsive, dùng theme navy và đỏ đô của `@slvn/ui`. Danh sách sách và danh mục lấy
từ backend; đăng nhập mới có giao diện, chưa kết nối API.

## Luồng xử lý

- `/` chuyển tới `/sach`. Trang danh sách render trên server: tìm theo tên/ISBN, lọc danh mục (cây danh mục, thụt lề
  theo cấp), khoảng giá, loại sách, loại bìa, sắp xếp và phân trang **24 sách/trang**.
- Bộ lọc nằm trong query string (`q`, `category`, `type`, `cover`, `minPrice`, `maxPrice`, `sort`, `page`); đổi bộ lọc
  đặt lại trang. Giá trị backend sẽ từ chối (loại sách/bìa/sort lạ, giá âm, `page` không phải số) bị bỏ qua; khoảng
  giá ngược được đảo lại. Logic ở `features/catalog/catalog.ts` (`toBooksQuery`).
- Thẻ sách hiện loại sách, ấn bản, năm, giá bán, giá bìa gạch ngang và nhãn giảm giá từ `discountPercent`. Sách chưa có
  SKU hiện "Chưa có giá bán". Xem nhanh mở dialog có nhãn "Cập nhật đến" và trạng thái bán (sắp phát hành, ngừng bán,
  còn/tạm hết hàng); đóng bằng nút hoặc Escape.
- Ảnh bìa dùng `coverImageUrl`; sách chưa có ảnh thì vẽ bìa thay thế từ tên sách.
- Danh sách trống khi chưa lọc hiện "Tủ sách đang được cập nhật"; có lọc thì gợi ý bỏ bớt bộ lọc.
- Header lấy danh mục gốc từ API (desktop hiện 4 danh mục đầu và "Giáo trình", mobile hiện đủ). Phần này nằm trong
  `Suspense`: backend chậm thì Header vẫn hiện, lỗi thì chỉ còn link chung và ghi `console.error` phía server.
- Lỗi khi tải trang `/sach` hiện `app/sach/error.tsx` (nút thử lại, mã tra cứu `digest`); lúc chờ hiện `loading.tsx`.
- `/dang-nhap` có React Hook Form + Zod, lỗi theo field, ẩn/hiện mật khẩu và ghi nhớ đăng nhập. Submit hợp lệ chỉ thông
  báo bản xem trước, không gọi API.

## API backend sử dụng

Gọi từ Server Component qua `serverApi` (`src/lib/api.ts`), cache `revalidate` 60 giây:

| Method | Route                | Dùng cho                       |
| ------ | -------------------- | ------------------------------ |
| GET    | `/api/v1/books`      | Danh sách, lọc, sắp xếp, trang |
| GET    | `/api/v1/categories` | Bộ lọc danh mục, menu Header   |

Response được parse bằng Zod ở `features/catalog/schemas.ts` vì type sinh từ OpenAPI đang lệch với JSON thật (enum sinh
thành `number`, số thành `number | string`). Lỗi API (`ApiError`) hoặc response sai dạng ở trang `/sach` đi tới
`error.tsx`.

## Cấu hình cần thiết

`API_BASE_URL` (gốc URL backend, không có `/api/v1`), xem `docs/deploy-vercel.md`. Local: copy
`apps/storefront/.env.example` thành `apps/storefront/.env.local`, rồi chạy `pnpm --filter @slvn/storefront dev` ở cổng 3000.

## Hạn chế / việc còn lại

- Chưa có trang chi tiết `/sach/[slug]`, giỏ hàng, đặt mua; xem nhanh chưa dẫn sang trang chi tiết.
- Ảnh bìa dùng `next/image` với `unoptimized` vì chưa chốt CDN; khi có domain ảnh thì khai báo `images.remotePatterns`
  và bỏ `unoptimized`.
- Backend tìm kiếm có phân biệt dấu ("dan su" không ra "Dân sự"); `sort=newest` đang đưa sách chưa có `releaseDate`
  lên đầu (lỗi đã biết của backend).
- Đề nghị backend sửa OpenAPI (enum dạng chuỗi, số dạng integer, tên query param chữ thường) để bỏ được schema Zod tự
  viết.
- Chưa kết nối auth, 2FA, refresh một luồng hoặc ghi nhớ phiên; chưa có proxy `rewrites` cho request từ trình duyệt.
  API reference ghi access token ở memory và refresh token trong cookie HttpOnly, khác mô tả cũ trong SKILL.md.
- Chưa dựng app admin.

## Kiểm tra

Unit test cho chuyển query/phân trang/cây danh mục/trạng thái bán và `BookCard`, cùng form đăng nhập. Playwright tìm
sách (mở xem nhanh nếu backend có kết quả) và validation đăng nhập; test e2e cần backend tại `API_BASE_URL`.
