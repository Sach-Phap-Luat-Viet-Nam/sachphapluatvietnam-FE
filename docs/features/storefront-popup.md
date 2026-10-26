# Popup quảng cáo trên storefront

## Mục đích

Hiện popup quảng cáo (ảnh + link) mà marketing đang chạy, theo tần suất cấu hình trên Admin. Đặc tả backend, quy tắc
chọn popup và API Admin ở `docs/features/popup.md`; file này chỉ mô tả phần FE.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **storefront**, mọi trang (`PromoPopup` đặt trong `app/layout.tsx`).

1. Sau khi trang hiện (không chặn render, không làm chậm SSR), `features/popup/api.ts` gọi `GET /popups/active` qua
   proxy `/api/v1`. `204` hoặc lỗi thì không hiện gì (lỗi chỉ ghi `console.warn`).
2. Kiểm tra tần suất (`features/popup/popup.ts`), khóa `popup:{id}:{updatedAt}` (popup vừa sửa thì hiện lại):

   | `displayFrequency` | Hiện khi                                              | Lưu dấu đã xem                       |
   | ------------------ | ----------------------------------------------------- | ------------------------------------ |
   | `every_visit`      | Mỗi lần tải trang (chuyển trang trong site thì không) | Không                                |
   | `once_per_session` | Chưa có khóa trong `sessionStorage`                   | `sessionStorage`, giá trị `1`        |
   | `once_per_day`     | Ngày đã lưu khác ngày hôm nay theo giờ Việt Nam       | `localStorage`, giá trị `YYYY-MM-DD` |

   Trình duyệt chặn storage thì popup hiện như `every_visit`.

   Thiết bị mới đang xem **hướng dẫn sử dụng** ở trang chủ (`storefront-tour.md`) thì popup đợi hướng dẫn kết thúc
   (xong hoặc bỏ qua) rồi mới hiện (`lib/onboarding-gate.ts`).

3. Chỉ mở `<dialog>` khi **ảnh đã tải xong** (không hiện khung trống), ghi dấu đã xem lúc mở. Nền phía sau dùng token
   `--color-scrim` nên **luôn tối**, kể cả ở giao diện sáng (trước đây dùng `ink` nên ở giao diện sáng nền bị sáng).
4. Đóng bằng nút X ("Đóng quảng cáo") hoặc phím Esc. Bấm vào ảnh là mở `linkUrl` và đóng popup (không có nút
   riêng). Ảnh hiện theo kích thước thật, tối đa 85% chiều cao màn hình và 64rem; trên PC rộng tối thiểu 36rem.
5. **Link an toàn** (kiểm tra lại dù backend đã chặn): chỉ nhận path trong site (mở bằng `next/link`) hoặc URL
   `http`/`https` (mở tab mới, `rel="noopener noreferrer"`). Link khác (`javascript:`, `data:`, `//host`...) bị bỏ,
   popup chỉ còn ảnh.
6. `title` là alt của ảnh và tên của dialog cho trình đọc màn hình.

### Xem lại ưu đãi ở trang chủ (`OfferShelf`)

Khách lỡ tắt popup lúc mới vào web thì xem lại được ở khu **"Ưu đãi đang chạy"** trên trang chủ, nằm giữa dải danh mục
và phần "Vừa lên kệ" (`app/page.tsx`). Popup tự bật ở trên giữ nguyên, không đổi.

- **Dữ liệu**: Server Component gọi `getRunningPopups()` (`features/popup/server.ts`, `GET /popups/running`, không giới hạn số lượng
  popup theo ưu tiên) cùng lúc với sách và danh mục, nên khu này nằm trong HTML dựng sẵn (làm mới 60 giây như trang
  chủ), không phải đợi tải ở trình duyệt. Lỗi hoặc không có popup thì **ẩn cả khu**, không làm hỏng trang.
- **Giao diện** (`features/popup/OfferShelf.tsx`): băng-rôn trượt, mỗi lần một chương trình. Banner luôn **1920×1080**
  nên khung cố định **16:9 ở mọi cỡ màn hình** (`aspect-video`, `object-cover`) và hiện đủ ảnh, không cắt. Khung rộng tối
  đa `max-w-3xl` (48rem) và căn giữa, gọn hơn bề rộng nội dung. **Không in tên chương trình** lên ảnh (banner đã có chữ; tên chỉ còn trong `sr-only` làm nhãn nút);
  dải tối mỏng ở đáy ảnh chỉ có "Xem lại nội dung", muốn xem đủ nội dung thì bấm thẻ để mở hộp thoại. Không hiện ngày kết thúc (API storefront không trả `endsAt`).
- **Chuyển động** (chỉ `opacity`/`transform`, 0,5 giây, easing `--ease-out-soft`; luôn bật, không theo
  `prefers-reduced-motion` như quy ước ở `storefront-shell.md`): băng-rôn đang xem sáng và đủ cỡ, băng-rôn còn lại mờ
  (`opacity-40`) và nhỏ hơn 6% (`scale-[0.94]`); dòng "Xem lại nội dung" mờ dần và trượt lên khi băng-rôn vào giữa. Trạng
  thái theo vị trí cuộn nên đúng cả khi khách vuốt tay; thẻ đang xem có `data-active="true"`. **Tự chuyển** sang băng-rôn kế tiếp
  mỗi **2 giây** (`AUTO_ADVANCE_MS`), hết vòng thì quay lại đầu; tạm dừng khi rê chuột vào khu này, khi focus bàn phím
  (`:focus-visible`) hoặc đang mở hộp thoại, và đếm lại 2 giây sau mỗi lần đổi băng-rôn (kể cả khách bấm nút hay vuốt
  tay). Chạm trên điện thoại không tạm dừng. Tự chuyển luôn bật, không theo `prefers-reduced-motion` như phần chuyển động.
- **Bấm thẻ** mở `<dialog>` cùng kiểu popup tự bật: ảnh đầy đủ, nút đóng (X hoặc Esc), thanh dưới có tên chương trình và
  nút **"Xem chương trình"** nếu popup có link (link kiểm tra bằng `safePopupLink`, link ngoài mở tab mới). Khác popup tự
  bật là có nút riêng thay vì bấm vào ảnh. Hộp thoại rộng đúng bằng ảnh; tiêu đề dài tự xuống dòng cạnh nút (thanh dưới
  dùng `w-0 min-w-full` để không làm hộp thoại rộng thêm).
- **Không áp `displayFrequency`** và **không ghi dấu "đã xem"**: bấm xem lại không làm popup tự bật biến mất hay hiện lại.

## API backend sử dụng (method, route, mã lỗi được xử lý)

| Method | Route                    | Dùng cho                           | Xử lý                                                                |
| ------ | ------------------------ | ---------------------------------- | -------------------------------------------------------------------- |
| GET    | `/api/v1/popups/active`  | Popup đang chạy                    | 200 → parse Zod `popupSchema`; 204 → không hiện; lỗi → không hiện    |
| GET    | `/api/v1/popups/running` | Khu "Ưu đãi đang chạy" ở trang chủ | 200 → mảng `popupSchema` (không giới hạn, có thể rỗng); lỗi → ẩn khu |

- Hai route đã có trong OpenAPI sinh ra (`pnpm api:fetch && pnpm api:generate`), response vẫn parse bằng Zod
  (`popupSchema`) theo `docs/features/popup.md` vì type sinh ra để số là `number | string`.
- **Cần backend có `GET /popups/running`** (commit `feat(content): add GET /popups/running`). Backend cũ trả 404 thì khu
  này tự ẩn, trang chủ vẫn bình thường.

## Cấu hình cần thiết (biến môi trường)

Không thêm biến mới. Dùng proxy `/api/v1` của storefront (`API_BASE_URL`, `PROXY_SECRET`).

## Hạn chế / việc còn lại

- Chưa có màn quản lý popup ở app admin (danh sách, tạo/sửa/xóa, upload ảnh Cloudinary, menu cho `marketing`).
- Ảnh popup chưa tối ưu qua `next/image` (`unoptimized`, chưa khai báo `images.remotePatterns` cho Cloudinary).
- Ảnh popup lớn có thể bị tính là LCP của trang (hiện sau khi tải trang); theo dõi Core Web Vitals khi bật popup thật.
- Dấu đã xem của popup cũ (`popup:{id}:{updatedAt}` cũ) không tự xóa khỏi `localStorage`.
- Chưa đếm lượt hiển thị/lượt bấm (backend chưa có API).
- Thẻ giả định banner tỷ lệ 16:9 (1920×1080). Ảnh khác tỷ lệ (ví dụ poster dọc) sẽ bị cắt hai mép trên/dưới ở thẻ, nội
  dung đầy đủ xem khi bấm vào thẻ. Muốn thẻ luôn hiện nguyên ảnh thì đổi `object-cover` thành `object-contain` ở
  `OfferShelf.tsx` (ảnh lệch tỷ lệ sẽ có viền tối).
- Khu này chỉ có ở trang chủ (chưa có ở các trang khác).
- Số chương trình không bị giới hạn: khu này là **băng-rôn trượt** (mỗi lần một chương trình, không xuống hàng) với nút "Chương trình trước/sau" hai bên, chấm tròn phía dưới (chấm đang xem kéo dài) và vuốt/cuộn ngang; hết vòng thì quay lại đầu/cuối. Chỉ có một chương trình thì ẩn nút và chấm. Bấm băng-rôn mở lại popup đầy đủ như trước. Backend đã bỏ mức tối đa 3 (`PopupService.MaxRunningPopups`), cần deploy backend mới thì mới hiện quá 3 chương trình.
