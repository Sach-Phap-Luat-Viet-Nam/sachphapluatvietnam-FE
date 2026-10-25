# Hướng dẫn sử dụng cho khách mới (storefront)

## Mục đích

Thiết bị lần đầu vào trang chủ được dẫn qua các chức năng chính của web: nền tối phủ trang, lỗ sáng ôm từng nút, cạnh
đó là hộp text mô tả chức năng kèm nhân vật hướng dẫn. Khách bỏ qua được bất cứ lúc nào và xem lại được từ chân trang.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **storefront**, chỉ ở **trang chủ** `/` (`GuidedTour` đặt trong `app/layout.tsx`, theo dõi `pathname`). Khách vào
thẳng trang khác (ví dụ `/sach/<slug>` từ Google) không bị chặn; khi nào về trang chủ thì hướng dẫn mới hiện.

1. **Khi nào hiện** (`features/tour/tour-storage.ts`): `localStorage` chưa có khóa `tour:v1:done`. Trình duyệt chặn
   storage thì **không hiện** (không nhớ được đã xem nên nếu hiện thì lần nào cũng làm phiền). Đổi nội dung hướng dẫn
   thì tăng `TOUR_STORAGE_KEY` lên `v2` để khách cũ xem lại.
2. Đợi 1,2 giây cho hiệu ứng mở đầu của trang chủ chạy xong rồi mới tải `driver.js` (import động, không nằm trong bundle
   ban đầu, không ảnh hưởng SSR/LCP).
3. **Các bước** (`features/tour/steps.ts`, xếp từ trên xuống dưới):

   | #   | Phần tử (`data-tour`) | Nội dung                                               |
   | --- | --------------------- | ------------------------------------------------------ |
   | 1   | (giữa màn hình)       | Lời chào, nút "Bắt đầu" / "Bỏ qua"                     |
   | 2   | `promo-bar`           | Thanh ưu đãi đầu trang                                 |
   | 3   | `search`              | Ô tìm sách theo tên hoặc ISBN                          |
   | 4   | `theme`               | Đổi giao diện sáng / tối                               |
   | 5   | `cart`                | Giỏ hàng, mua không cần tài khoản                      |
   | 6   | `account`             | Đăng nhập / tài khoản, Đơn của tôi                     |
   | 7   | `explore`             | Nút "Khám phá tủ sách"                                 |
   | 8   | `categories`          | Dải danh mục                                           |
   | 9   | `offers`              | Khu "Ưu đãi đang chạy"                                 |
   | 10  | `book`                | Thẻ sách đầu tiên: xem nhanh, mua ngay, thêm vào giỏ   |
   | 11  | `zalo`                | Nút tư vấn qua Zalo                                    |
   | 12  | `order-lookup`        | Link "Tra cứu đơn hàng" ở chân trang (mới thêm)        |
   | 13  | `replay`              | Kết thúc, chỉ nút "Xem hướng dẫn sử dụng" ở chân trang |

   Phần tử không có trên trang hoặc đang cao/rộng 0 (backend lỗi nên ẩn danh mục, chưa có ưu đãi, thanh ưu đãi đã đóng)
   thì **bỏ bước đó**, bộ đếm "n/tổng" chỉ đếm các bước còn lại.

4. **Điều khiển**: "Tiếp" / "Quay lại" / "Hoàn tất", nút X ("Bỏ qua hướng dẫn"), phím Esc, phím mũi tên. Bấm ra ngoài
   (vùng tối) **không** đóng hướng dẫn để tránh bấm nhầm. Trong lúc hướng dẫn chạy, phần tử đang sáng không bấm được.
5. **Ghi dấu đã xem** khi Hoàn tất, Bỏ qua, X hoặc Esc. Rời trang chủ giữa chừng (nút Back) thì chưa tính là đã xem.
6. **Xem lại**: nút "Xem hướng dẫn sử dụng" ở chân trang (`TourReplayButton`). Đang ở trang khác thì chuyển về trang
   chủ rồi chạy; xem lại không cần xóa dấu đã xem.
7. **Popup quảng cáo đợi hướng dẫn** (`lib/onboarding-gate.ts`): hướng dẫn quyết định chạy thì popup tự bật
   (`PromoPopup`) đợi tới khi hướng dẫn kết thúc mới hiện.

### Giao diện

- Nền tối dùng token `--color-scrim` (`globals.css`), **luôn tối ở cả chế độ sáng**; cùng token với nền của popup và
  các hộp thoại khác.
- Hộp text theo theme "Thư viện đêm" (`.tour-popover` trong `globals.css`, ngoài `@layer` để thắng `driver.css`):
  tiêu đề Lora màu vàng, nút chính nền vàng, cỡ chữ nội dung 16px, nút cao 44px. Không có mũi tên.
- Nhân vật hướng dẫn ở cột trái hộp text (88px, mobile 64px), mỗi bước một tư thế (`wave`, `point`, `book`, `cheer`).
- Mở hộp thì focus vào nút chính ("Bắt đầu" / "Tiếp"). Hộp có `role="dialog"`, tên lấy từ tiêu đề bước, Tab chỉ chạy
  trong hộp (do `driver.js` lo).
- Bật giảm chuyển động (`prefers-reduced-motion`) thì tắt hiệu ứng và cuộn mượt.

### Ảnh nhân vật

Hiện có một ảnh `public/tour/guide-presenter.webp` (nhân viên tay mở giới thiệu, 264×330, 16 KB) dùng cho mọi tư thế.
Ảnh gốc 1024×1536 PNG (1,9 MB) được cắt từ đầu tới ngang thắt lưng theo tỉ lệ 4:5 (vùng `y` 120–1400) rồi thu nhỏ và
chuyển sang WebP giữ nền trong suốt.

Thêm ảnh cho từng tư thế:

1. Ảnh **nền trong suốt, tỉ lệ 4:5**, xuất 264×330 (gấp 3 cỡ hiển thị 88×110), WebP, dung lượng nhỏ (< 60 KB).
2. Đặt vào `apps/storefront/public/tour/`, ví dụ `guide-wave.webp`, `guide-cheer.webp`.
3. Đổi đường dẫn trong `GUIDE_IMAGES` (`features/tour/steps.ts`).

## API backend sử dụng (method, route, mã lỗi được xử lý)

Không gọi API. Dấu đã xem lưu theo thiết bị (`localStorage`), không theo tài khoản.

## Cấu hình cần thiết (biến môi trường)

Không thêm biến mới. Package mới: `driver.js` (MIT) ở `apps/storefront`.

## Hạn chế / việc còn lại

- Mới có một ảnh nhân vật cho cả 4 tư thế (vẫy chào, chỉ tay, cầm sách, chúc mừng).
- Dấu đã xem theo thiết bị: khách đổi trình duyệt/máy hoặc xóa dữ liệu trình duyệt sẽ thấy lại hướng dẫn.
- Chỉ có hướng dẫn ở trang chủ; các trang khác (giỏ hàng, thanh toán, tài khoản) chưa có.
- Ảnh nhân vật chèn bằng thẻ `img` thường (hộp text do `driver.js` dựng bằng DOM nên không dùng được `next/image`).
- Chưa đo tỉ lệ khách xem hết / bỏ qua (chưa có công cụ analytics).

## Kiểm tra

- Unit: `tour-storage.test.ts` (thiết bị mới, đã xem, storage bị chặn), `steps.test.ts` (bỏ bước thiếu phần tử),
  `lib/onboarding-gate.test.ts` (popup đợi hướng dẫn).
- Playwright `e2e/tour.spec.ts` (desktop + mobile): đi hết các bước rồi tải lại không hiện nữa; bỏ qua rồi xem lại từ
  chân trang ở `/sach`; popup quảng cáo chỉ hiện sau khi bỏ qua hướng dẫn. Các test e2e khác mặc định đã có dấu đã xem
  (`storageState` trong `playwright.config.ts`).
