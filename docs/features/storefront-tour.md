# Hướng dẫn sử dụng cho khách mới (storefront)

## Mục đích

Thiết bị lần đầu vào trang chủ được dẫn qua các chức năng chính của web: nền tối phủ trang, lỗ sáng ôm từng nút, cạnh
đó là hộp text mô tả chức năng kèm nhân vật hướng dẫn. Khách bỏ qua được bất cứ lúc nào và xem lại được bằng nút nổi ở góc màn hình.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **storefront**, chỉ ở **trang chủ** `/` (`GuidedTour` đặt trong `app/layout.tsx`, theo dõi `pathname`). Khách vào
thẳng trang khác (ví dụ `/sach/<slug>` từ Google) không bị chặn; khi nào về trang chủ thì hướng dẫn mới hiện.

1. **Khi nào hiện** (`features/tour/tour-storage.ts`): `localStorage` chưa có khóa `tour:v1:done`. Trình duyệt chặn
   storage thì **không hiện** (không nhớ được đã xem nên nếu hiện thì lần nào cũng làm phiền). Đổi nội dung hướng dẫn
   thì tăng `TOUR_STORAGE_KEY` lên `v2` để khách cũ xem lại.
2. Đợi 1,2 giây cho hiệu ứng mở đầu của trang chủ chạy xong rồi mới tải `driver.js` (import động, không nằm trong bundle
   ban đầu, không ảnh hưởng SSR/LCP).
3. **Các bước** (`features/tour/steps.ts`, xếp từ trên xuống dưới):

   | #   | Phần tử (`data-tour`) | Nội dung                                             |
   | --- | --------------------- | ---------------------------------------------------- |
   | 1   | (giữa màn hình)       | Lời chào, nút "Bắt đầu" / "Bỏ qua"                   |
   | 2   | `promo-bar`           | Thanh ưu đãi đầu trang                               |
   | 3   | `search`              | Ô tìm sách theo tên hoặc ISBN                        |
   | 4   | `theme`               | Đổi giao diện sáng / tối                             |
   | 5   | `cart`                | Giỏ hàng, mua không cần tài khoản                    |
   | 6   | `account`             | Đăng nhập / tài khoản, Đơn của tôi                   |
   | 7   | `explore`             | Nút "Khám phá tủ sách"                               |
   | 8   | `categories`          | Dải danh mục                                         |
   | 9   | `offers`              | Khu "Ưu đãi đang chạy"                               |
   | 10  | `book`                | Thẻ sách đầu tiên: xem nhanh, mua ngay, thêm vào giỏ |
   | 11  | `zalo`                | Nút tư vấn qua Zalo                                  |
   | 12  | `order-lookup`        | Link "Tra cứu đơn hàng" ở chân trang (mới thêm)      |
   | 13  | `replay`              | Kết thúc, chỉ nút nổi "Xem hướng dẫn sử dụng"        |

   Phần tử không có trên trang hoặc đang cao/rộng 0 (backend lỗi nên ẩn danh mục, chưa có ưu đãi, thanh ưu đãi đã đóng)
   thì **bỏ bước đó**, bộ đếm "n/tổng" chỉ đếm các bước còn lại.

4. **Điều khiển**: "Tiếp" / "Quay lại" / "Hoàn tất", nút X ("Bỏ qua hướng dẫn"), phím Esc, phím mũi tên. Bấm ra ngoài
   (vùng tối) **không** đóng hướng dẫn để tránh bấm nhầm. Trong lúc hướng dẫn chạy, phần tử đang sáng không bấm được.
5. **Ghi dấu đã xem** khi Hoàn tất, Bỏ qua, X hoặc Esc. Rời trang chủ giữa chừng (nút Back) thì chưa tính là đã xem.
6. **Xem lại** (không cần xóa dấu đã xem): có hai nút, đang ở trang khác thì chuyển về trang chủ rồi chạy.
   - **Nút nổi** `TourReplayFab` (dấu `?`, góc phải dưới mọi trang, xếp ngay trên nút Zalo). Đây là mốc của bước cuối.
     Không đặt ở góc trái vì chỉ báo dev của Next.js nằm đúng chỗ đó và che mất nút khi chạy `next dev`.
   - **Link chữ** `TourReplayButton` ở chân trang, cạnh "Đăng nhập".
7. **Popup quảng cáo đợi hướng dẫn** (`lib/onboarding-gate.ts`): hướng dẫn quyết định chạy thì popup tự bật
   (`PromoPopup`) đợi tới khi hướng dẫn kết thúc mới hiện.

### Giao diện

- Nền tối dùng token `--color-scrim` (`globals.css`), **luôn tối ở cả chế độ sáng**; cùng token với nền của popup và
  các hộp thoại khác. Riêng hướng dẫn phủ đậm 90% (`overlayOpacity`) để chỉ phần được khoanh sáng nổi rõ.
- Hộp text theo theme "Thư viện đêm" (`.tour-popover` trong `globals.css`, ngoài `@layer` để thắng `driver.css`):
  tiêu đề Lora màu vàng, nút chính nền vàng, cỡ chữ nội dung 16px, nút cao 44px. Không có mũi tên.
- Nhân vật hướng dẫn **nằm ngoài hộp text**: nhô ra ở góc trên-trái, chồng vào hộp khoảng 55% bề ngang (104px, mobile
  80px), mỗi bước một tư thế (xem mục "Ảnh nhân vật"). Ảnh là thẻ `img` `position: fixed` gắn vào `body`, tự tính tọa
  độ theo hộp (`positionGuide` ở `GuidedTour.tsx`) và kẹp trong màn hình: driver.js chỉ giữ khung hộp trong màn hình
  chứ không biết phần ảnh nhô ra, nên làm ảnh con của hộp thì hộp mở sát mép trên sẽ cắt mất đầu nhân vật. Hộp chừa
  sẵn padding trái cho phần ảnh chồng vào.
- Mở hộp thì focus vào nút chính ("Bắt đầu" / "Tiếp"). Hộp có `role="dialog"`, tên lấy từ tiêu đề bước, Tab chỉ chạy
  trong hộp (do `driver.js` lo).
- Bật giảm chuyển động (`prefers-reduced-motion`) thì tắt hiệu ứng và cuộn mượt.

### Ảnh nhân vật

Bốn ảnh trong `public/tour/`, khai báo ở `GUIDE_IMAGES` (`features/tour/steps.ts`):

| Tư thế (`pose`) | File                 | Cử chỉ                           | Dùng ở bước                                       |
| --------------- | -------------------- | -------------------------------- | ------------------------------------------------- |
| `welcome`       | `guide-welcome.webp` | Tay mở giới thiệu                | Lời chào                                          |
| `point`         | `guide-point.webp`   | Nháy mắt, hai tay chỉ sang phải  | Các nút: ưu đãi, tìm, sáng/tối, giỏ, tài khoản…   |
| `present`       | `guide-present.webp` | Một tay chỉ, một tay mở bên phải | Khu nội dung: tủ sách, danh mục, ưu đãi, thẻ sách |
| `cheer`         | `guide-cheer.webp`   | Like và OK                       | Kết thúc                                          |

Cách làm từ ảnh gốc (PNG nền trong suốt, 1,7–2 MB mỗi ảnh): cắt từ đầu tới ngang thắt lưng theo tỉ lệ 4:5 (ảnh
1024×1536 lấy vùng `y` 120–1400; ảnh 1269×1239 giữ trọn chiều cao, đặt sát đáy khung và chừa trống phía trên), thu về
264×330 (gấp 3 cỡ hiển thị 88×110) rồi xuất WebP giữ nền trong suốt, mỗi file khoảng 15 KB. Thêm hoặc thay ảnh thì làm
theo cùng quy cách rồi đổi đường dẫn trong `GUIDE_IMAGES`.

## API backend sử dụng (method, route, mã lỗi được xử lý)

Không gọi API. Dấu đã xem lưu theo thiết bị (`localStorage`), không theo tài khoản.

## Cấu hình cần thiết (biến môi trường)

Không thêm biến mới. Package mới: `driver.js` (MIT) ở `apps/storefront`.

## Hạn chế / việc còn lại

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
