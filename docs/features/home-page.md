# Trang chủ

## Mục đích

Trang vào đầu tiên của storefront (`/`), thay cho việc chuyển thẳng sang `/sach`: giới thiệu tủ sách, nổi bật sách mới
nhất và dẫn khách vào tủ sách. Thiết kế "Thư viện đêm" trên Claude Design (màn hình "Trang chủ — chuyển động").

## Luồng xử lý (storefront, `src/app/page.tsx`)

1. **Hero** (`features/home`):
   - Tiêu đề "Đọc đúng luật. Bản mới nhất.", nút "Khám phá tủ sách" (`/sach`) và "Sách mới phát hành"
     (`/sach?sort=newest`).
   - Cuốn sách 3D (`Book3D`: bìa, gáy, mép giấy) lấy sách mới nhất; có ảnh bìa thì dùng ảnh, chưa có thì vẽ bìa mạ vàng.
     Có sách thì hiện con dấu "Ấn bản mới" và thẻ tên sách, "Cập nhật đến", giá (bấm vào mở trang chi tiết).
   - Hai cuốn xòe phía sau (`HeroFanBook`, ẩn trên mobile) là sách mới thứ 2 và 3: ảnh bìa thật, phủ tối nhẹ, bấm vào mở
     trang chi tiết. Thiếu sách thì vẽ bìa màu trơn như trang trí.
   - `HeroSpotlight` (client) đặt biến CSS theo vị trí chuột: ánh đèn vàng đi theo con trỏ, sách nghiêng 3D. Không chạy
     trên màn hình cảm ứng; chỉ đổi biến CSS, không render lại React.
   - Bụi sáng bay lên (`DustMotes`, ẩn trên mobile), vệt sáng chạy qua chữ mạ vàng.
2. **Băng chữ chạy** (`LawTicker`): các nhãn "Cập nhật đến" khác nhau của sách mới; dừng khi rê chuột hoặc focus; ẩn khi
   không có dữ liệu. Dãy lặp để vòng chạy liền mạch, dãy thứ hai ẩn với trình đọc màn hình.
3. **Thanh danh mục** đánh số, dẫn tới `/sach?category=<slug>`.
4. **Mới phát hành**: 4 sách mới nhất dùng `BookCard` của tủ sách; trống thì báo "Tủ sách đang được cập nhật".
   - Desktop (`lg`): lưới 4 cột. Mobile/tablet: kệ vuốt ngang (scroll-snap), mỗi thẻ rộng 68% (40% trên tablet) để lộ
     một phần cuốn kế tiếp, gợi ý vuốt.
   - Tên sách tối đa 3 dòng, giá luôn ở đáy thẻ để các thẻ cùng hàng thẳng nhau (áp dụng cả trang `/sach`).
   - Link "Xem tất cả sách mới" dẫn tới `/sach?sort=newest`.
5. Dải cam kết (ISBN/QĐXB, "Cập nhật đến", phí ship).

Trang dựng tĩnh, làm mới sau 60 giây (ISR). Backend lỗi lúc dựng thì vẫn hiện hero (bìa chung "Tủ sách pháp luật"),
các phần dữ liệu ẩn đi, ghi `console.error` và thử lại ở lần làm mới sau.

## API backend sử dụng

| Method | Route                                      | Dùng cho                              |
| ------ | ------------------------------------------ | ------------------------------------- |
| GET    | `/api/v1/books?Page=1&Limit=4&Sort=newest` | Sách nổi bật, băng chữ, mới phát hành |
| GET    | `/api/v1/categories`                       | Thanh danh mục                        |

## Cấu hình cần thiết

`API_BASE_URL`, như `storefront-shell.md`.

## Hạn chế / việc còn lại

- Sách nổi bật là sách mới nhất theo `sort=newest`; chưa có cách chọn sách nổi bật từ admin (CMS banner chưa có API).
- Lỗi đã biết của backend: `sort=newest` đưa sách chưa có `releaseDate` lên đầu, nên hero có thể không phải ấn bản mới
  nhất thật cho đến khi backend sửa.
- Hiệu ứng "hiện khi cuộn" cần trình duyệt hỗ trợ `animation-timeline` (Chromium); trình duyệt khác hiện nội dung ngay.
