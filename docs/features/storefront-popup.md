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

3. Chỉ mở `<dialog>` khi **ảnh đã tải xong** (không hiện khung trống), ghi dấu đã xem lúc mở.
4. Đóng bằng nút X ("Đóng quảng cáo") hoặc phím Esc. Bấm vào ảnh là mở `linkUrl` và đóng popup (không có nút
   riêng). Ảnh hiện theo kích thước thật, tối đa 85% chiều cao màn hình và 64rem; trên PC rộng tối thiểu 36rem.
5. **Link an toàn** (kiểm tra lại dù backend đã chặn): chỉ nhận path trong site (mở bằng `next/link`) hoặc URL
   `http`/`https` (mở tab mới, `rel="noopener noreferrer"`). Link khác (`javascript:`, `data:`, `//host`...) bị bỏ,
   popup chỉ còn ảnh.
6. `title` là alt của ảnh và tên của dialog cho trình đọc màn hình.

## API backend sử dụng (method, route, mã lỗi được xử lý)

| Method | Route                   | Dùng cho        | Xử lý                                                             |
| ------ | ----------------------- | --------------- | ----------------------------------------------------------------- |
| GET    | `/api/v1/popups/active` | Popup đang chạy | 200 → parse Zod `popupSchema`; 204 → không hiện; lỗi → không hiện |

- **OpenAPI trong repo chưa có route này** (chưa sinh lại được: Render tắt `/openapi/v1.json`, backend local không
  chạy). Route được khai báo tạm trong `packages/api-client/src/pending-paths.ts` với response `unknown`, response parse
  bằng Zod theo `docs/features/popup.md`.

## Cấu hình cần thiết (biến môi trường)

Không thêm biến mới. Dùng proxy `/api/v1` của storefront (`API_BASE_URL`, `PROXY_SECRET`).

## Hạn chế / việc còn lại

- Khi chạy được `pnpm api:fetch && pnpm api:generate` có route popup: xóa khai báo trong `pending-paths.ts`.
- Chưa có màn quản lý popup ở app admin (danh sách, tạo/sửa/xóa, upload ảnh Cloudinary, menu cho `marketing`).
- Ảnh popup chưa tối ưu qua `next/image` (`unoptimized`, chưa khai báo `images.remotePatterns` cho Cloudinary).
- Ảnh popup lớn có thể bị tính là LCP của trang (hiện sau khi tải trang); theo dõi Core Web Vitals khi bật popup thật.
- Dấu đã xem của popup cũ (`popup:{id}:{updatedAt}` cũ) không tự xóa khỏi `localStorage`.
- Chưa đếm lượt hiển thị/lượt bấm (backend chưa có API).
