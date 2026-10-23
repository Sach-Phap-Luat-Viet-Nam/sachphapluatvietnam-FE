# Giao diện chung, tủ sách và đăng nhập

## Mục đích

Giao diện storefront tiếng Việt, responsive, theo thiết kế **"Thư viện đêm"** (hướng A trên Claude Design): nền mực navy,
chữ ngà, nhấn vàng và đỏ đô, tiêu đề Playfair Display, chữ thường Be Vietnam Pro (cả hai có bộ glyph tiếng Việt).
Danh sách sách và danh mục lấy từ backend. Trang chủ: `home-page.md`; đăng nhập: `auth-login.md`.

## Luồng xử lý

- **Theme**: token màu riêng của storefront nằm trong `src/app/globals.css` (`@theme`), ghi đè token của `@slvn/ui` chỉ
  trong app này; theme chung của package vẫn sáng cho admin. Font nạp bằng `next/font` ở `layout.tsx`.
- **Header**: logo, ô tìm kiếm (form GET tới `/sach`), link Đăng nhập (đã đăng nhập thì hiện tên và nút Đăng xuất). Chưa hiện giỏ hàng vì chức năng giỏ chưa làm.
- **Footer**: chỉ link tới trang đã có và thông tin giao hàng/thanh toán có thật (BR-14); chưa có hotline, địa chỉ.
- **`/sach`** render trên server, phân trang **24 sách/trang**:
  - Thanh danh mục đánh số `00 Tất cả · 01 …` (danh mục gốc); chọn danh mục có con thì hiện hàng danh mục con.
  - Sidebar bộ lọc (desktop) hoặc nút "Bộ lọc (n)" mở bảng trượt từ dưới lên (mobile, `<dialog>`). Bộ lọc là form GET
    nên chạy cả khi chưa tải JavaScript; mức giá chọn nhanh là link.
  - Dòng "Đang lọc": mỗi bộ lọc là link bỏ riêng bộ lọc đó; giá trị đã chuẩn hóa như khi gọi API.
  - Sắp xếp dùng form có nút áp dụng (đổi bằng bàn phím không tải lại trang sau mỗi phím mũi tên).
- Query string (`q`, `category`, `type`, `cover`, `minPrice`, `maxPrice`, `sort`, `page`) đi qua `toBooksQuery`: giá trị
  backend sẽ từ chối bị bỏ qua, khoảng giá ngược được đảo lại.
- **Thẻ sách**: bìa đứng trên "kệ", nhãn giảm giá hoặc "Sắp phát hành", loại sách, ấn bản · năm, dòng "Cập nhật đến",
  giá bán và giá bìa gạch ngang, trạng thái (sắp phát hành, ngừng bán, tạm hết hàng – bìa mờ, chưa có giá). Bấm bìa
  hoặc tên sách mở dialog xem nhanh.
- Ảnh bìa dùng `coverImageUrl`; chưa có ảnh thì vẽ bìa mạ vàng từ tên sách.
- **`/dang-nhap`**: React Hook Form + Zod, lỗi theo field, ẩn/hiện mật khẩu, "Giữ đăng nhập 30 ngày", link mua sách không
  cần tài khoản. Gọi API đăng nhập thật, chi tiết ở `auth-login.md`.
- Lỗi khi tải trang hiện `error.tsx` (`/sach` riêng, còn lại dùng `app/error.tsx`): nút thử lại và mã tra cứu `digest`.

### Chuyển động

CSS trong `globals.css` (`@layer components`), chỉ animate `transform`/`opacity` nên không gây CLS:

- Header trượt xuống, tiêu đề hiện lên khi tải trang; khối "hiện khi cuộn" dùng `animation-timeline: view()`
  (trình duyệt chưa hỗ trợ thì hiện ngay).
- Hover thẻ sách: sách rút lên khỏi kệ, viền vàng phát sáng, hiện nhãn "Xem nhanh". Hover danh mục, nút, link có gạch
  chân vàng chạy ra, lớp màu quét ngang.
- Người dùng bật giảm chuyển động (`prefers-reduced-motion`) thì tắt hết animation/transition.

## API backend sử dụng

Gọi từ Server Component qua `serverApi` (`src/lib/api.ts`), cache `revalidate` 60 giây:

| Method | Route                | Dùng cho                               |
| ------ | -------------------- | -------------------------------------- |
| GET    | `/api/v1/books`      | Danh sách, lọc, sắp xếp, trang         |
| GET    | `/api/v1/categories` | Thanh danh mục, danh mục con, nhãn lọc |

Response được parse bằng Zod ở `features/catalog/schemas.ts` vì type sinh từ OpenAPI đang lệch với JSON thật (enum sinh
thành `number`, số thành `number | string`). Lỗi API (`ApiError`) hoặc response sai dạng đi tới `error.tsx`.

## Cấu hình cần thiết

`API_BASE_URL` (gốc URL backend, không có `/api/v1`), xem `docs/deploy-vercel.md`. Local: copy
`apps/storefront/.env.example` thành `apps/storefront/.env.local`, rồi chạy `pnpm --filter @slvn/storefront dev` ở cổng 3000.

## Hạn chế / việc còn lại

- Chưa có trang chi tiết `/sach/[slug]`, giỏ hàng, đặt mua, tra cứu đơn; nút "Thêm vào giỏ" trong thiết kế chưa hiện.
- Ảnh bìa dùng `next/image` với `unoptimized` vì chưa chốt CDN; khi có domain ảnh thì khai báo `images.remotePatterns`.
- Backend tìm kiếm có phân biệt dấu; `sort=newest` đang đưa sách chưa có `releaseDate` lên đầu (lỗi đã biết của backend).
- Đề nghị backend sửa OpenAPI (enum dạng chuỗi, số dạng integer, tên query param chữ thường) để bỏ schema Zod tự viết.
- Chưa kết nối auth, 2FA, refresh một luồng hoặc ghi nhớ phiên.
- Thiết kế còn các phần chưa có dữ liệu thật: hotline, email, địa chỉ ở footer.

## Kiểm tra

Unit test: chuyển query, phân trang, mức giá, nhãn "Đang lọc", cây danh mục, trạng thái bán, `BookCard`, form đăng nhập.
Playwright (desktop + mobile): trang chủ, tìm sách (mở xem nhanh nếu backend có kết quả), validation đăng nhập, không có
cuộn ngang. Test e2e cần backend tại `API_BASE_URL`.
