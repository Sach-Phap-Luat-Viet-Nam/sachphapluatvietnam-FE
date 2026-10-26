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
- Nhân vật hướng dẫn **to và đứng sau hộp text** (rộng 240px, mobile 160px), thò ra phía ngoài; ảnh nằm dưới hộp một
  lớp `z-index` nên phần chồng lên hộp bị hộp che đi, **không bao giờ đè lên chữ**. Vị trí do hàm thuần `placeGuide`
  (`guide-placement.ts`, có test) chọn, theo thứ tự: phía trên, bên phải, bên trái, phía dưới hộp (phía dưới thì đứng
  lộ nguyên đầu, không khuất sau hộp). Điều kiện: đủ chỗ trong màn hình và **không che phần tử đang được khoanh sáng**.
  Chỗ trống không đủ thì thu nhỏ ảnh (tối thiểu 60%), vẫn không đủ thì ẩn nhân vật ở bước đó. **Phần tử đích quá lớn** (chiếm trên 20% màn hình, như cả khu "Ưu đãi đang chạy" mà hộp text nằm ngay bên trong) thì không né được, nên bỏ luật né và ưu tiên đứng hai bên hộp, ngang hàng với hộp (đáy ảnh trùng đáy hộp). Ảnh đứng bên phải hộp
  thì lật ngang để cử chỉ luôn hướng vào hộp (`GUIDE_FACING` ở `steps.ts`).
- Ảnh là thẻ `img` `position: fixed` gắn vào `body`, tự tính tọa độ theo hộp và theo dõi khi hộp dịch chuyển, cuộn,
  đổi cỡ màn hình (`positionGuide` ở `GuidedTour.tsx`). Không làm ảnh con của hộp vì driver.js chỉ giữ khung hộp trong
  màn hình chứ không biết phần ảnh thò ra, hộp mở sát mép trên sẽ cắt mất đầu nhân vật.
- **Chuyển bước mượt**: dùng hai ảnh luân phiên (`createGuideLayer` ở `GuidedTour.tsx`). Ảnh của bước mới được tải và giải mã xong mới đặt vào chỗ của nó rồi hiện dần (0,4s) và trồi nhẹ từ dưới lên, cùng lúc ảnh của bước trước mờ dần và chìm xuống, nên tổng độ rõ luôn xấp xỉ 1, không có nhịp trống. Chỉ `opacity` và `translate` có chuyển động; vị trí đổi tức thì để ảnh bám theo hộp khi cuộn. Khi bấm Tiếp, driver.js ẩn hộp cũ (kích thước 0) rồi mới vẽ hộp mới: lúc đó bộ theo dõi bỏ qua, ảnh cũ ở lại tới khi ảnh mới sẵn sàng (không thì ảnh cũ tắt ngay còn ảnh mới hiện chậm ~250ms). Ảnh các tư thế được tải sẵn khi tour bắt đầu (`preloadGuides`). Tắt hiệu ứng khi bật giảm chuyển động.
- **Đa dạng tư thế và đúng nội dung**: 11 ảnh, mỗi bước một ảnh hợp với điều đang nói (kính lúp ở bước tìm sách và tra
  cứu đơn, tai nghe ở bước Zalo, giơ sách ở bước khám phá tủ sách...). 13 bước dùng cả 11 tư thế, chỉ `point` và `search`
  xuất hiện hai lần và không bao giờ liền nhau. Có bước bị bỏ (không có danh mục, chưa có ưu đãi...) làm hai bước cùng tư
  thế đứng cạnh nhau thì `varyPoses` (`steps.ts`) đổi bước sau sang tư thế khác.
- Mở hộp thì focus vào nút chính ("Bắt đầu" / "Tiếp"). Hộp có `role="dialog"`, tên lấy từ tiêu đề bước, Tab chỉ chạy
  trong hộp (do `driver.js` lo).
- Hiệu ứng và cuộn mượt luôn bật, không theo `prefers-reduced-motion`.

### Ảnh nhân vật

Mười một ảnh trong `public/tour/`, khai báo ở `GUIDE_IMAGES` (`features/tour/steps.ts`). Tên tư thế đặt theo nội dung ảnh:

| Tư thế (`pose`) | File (ảnh gốc)                  | Cử chỉ                                  | Dùng ở bước                |
| --------------- | ------------------------------- | --------------------------------------- | -------------------------- |
| `welcome`       | `guide-welcome.webp` (1.png)    | Tay mở giới thiệu                       | Lời chào                   |
| `point`         | `guide-point.webp` (2.png)      | Nháy mắt, hai tay chỉ sang phải         | Thanh ưu đãi, thẻ sách     |
| `cheer`         | `guide-cheer.webp` (3.png)      | Like và OK                              | Kết thúc                   |
| `present`       | `guide-present.webp` (4.png)    | Một tay chỉ, một tay mở bên phải        | Danh mục                   |
| `open`          | `guide-open.webp` (5.png)       | Hai tay mở sang hai bên (ảnh **ngang**) | Ưu đãi đang chạy           |
| `calm`          | `guide-calm.webp` (6.png)       | Đứng thẳng, hai tay đan nhau, mỉm cười  | Sáng/tối                   |
| `search`        | `guide-search.webp` (7.png)     | Cầm kính lúp, tay chỉ                   | Tìm sách, tra cứu đơn hàng |
| `books`         | `guide-books.webp` (8.png)      | Hai tay giơ hai cuốn sách của shop      | Khám phá tủ sách           |
| `support`       | `guide-support.webp` (9.png)    | Đeo tai nghe, tay chạm micro            | Tư vấn qua Zalo            |
| `confident`     | `guide-confident.webp` (10.png) | Khoanh tay, mỉm cười tự tin             | Tài khoản                  |
| `study`         | `guide-study.webp` (11.png)     | Ôm cuốn vở trước ngực                   | Giỏ hàng                   |

Cách làm từ ảnh gốc (PNG nền trong suốt, 1,7–2 MB mỗi ảnh): cắt từ đầu tới ngang thắt lưng theo tỉ lệ 4:5 (ảnh
1024×1536 lấy vùng `y` 40–1400 tùy ảnh để đủ đầu, tay và vật cầm; ảnh 1269×1239 giữ trọn chiều cao, đặt sát đáy khung),
thu về 480×600 (gấp đôi cỡ hiển thị tối đa 240px để nét trên màn hình độ phân giải cao) rồi xuất WebP giữ nền trong suốt,
mỗi file khoảng 26–56 KB. Riêng `open` (ảnh ngang, hai bàn tay nằm sát hai mép, cắt 4:5 sẽ mất tay) giữ khung rộng 720×471
và hiện rộng gấp 1,5 lần để đầu nhân vật to bằng các ảnh khác (`scale` ở `GUIDE_SHAPE`).
**Làm sạch alpha**: ảnh gốc còn sót vùng gần như trong suốt (alpha 1–39) quanh người; bóng đổ `drop-shadow` biến vùng đó
thành khung chữ nhật mờ cạnh nhân vật. Trước khi xuất WebP, điểm ảnh có alpha dưới 40 được đưa về 0 và các mức còn lại
kéo giãn lại cho mượt viền.

Thêm hoặc thay ảnh thì làm theo cùng quy cách. Muốn thêm tư thế mới: thêm giá trị vào `GuidePose`, rồi `GUIDE_IMAGES`,
`GUIDE_SHAPE` (tỉ lệ cao/rộng của file, hệ số bề rộng để đầu to bằng các ảnh khác, kích thước file), `GUIDE_FACING`
(cử chỉ trong ảnh gốc hướng trái hay phải) và `POSE_CYCLE`; cuối cùng gán `pose` cho các bước trong `TOUR_STEPS`.

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

- Unit: `tour-storage.test.ts` (thiết bị mới, đã xem, storage bị chặn), `steps.test.ts` (bỏ bước thiếu phần tử, không
  hai bước liền kề cùng tư thế kể cả khi bước bị bỏ), `guide-placement.test.ts` (chọn chỗ đặt nhân vật, lật ảnh, né
  phần tử đang giới thiệu, không tràn màn hình, ẩn khi hết chỗ), `lib/onboarding-gate.test.ts` (popup đợi hướng dẫn).
- Playwright `e2e/tour.spec.ts` (desktop + mobile): đi hết các bước rồi tải lại không hiện nữa; bỏ qua rồi xem lại từ
  link ở chân trang; xem lại bằng nút nổi từ `/sach`; popup quảng cáo chỉ hiện sau khi bỏ qua hướng dẫn. Các test e2e
  khác mặc định đã có dấu đã xem (`storageState` trong `playwright.config.ts`).
