# Storefront: thanh toán có khuyến mãi, phí vận chuyển và trang khuyến mãi

Hợp đồng API: `docs/features/checkout-promotion-shipping.md`. File này mô tả phần giao diện Storefront.

## Mục đích

- Trang thanh toán hiển thị đúng số tiền backend tính (giảm giá, phí ship, tổng) và cho nhập mã giảm giá.
- Trang `/khuyen-mai` liệt kê chương trình đang chạy.
- Chi tiết đơn hiển thị giảm giá theo dòng, giảm phí ship và các ưu đãi đã áp.

## Luồng xử lý (màn hình, route, app storefront/admin)

- `/thanh-toan` (cả đặt từ giỏ và "Mua ngay"): `Checkout.tsx` gọi `useCheckoutPreview` mỗi khi đổi giỏ, tỉnh/thành,
  số điện thoại hoặc mã. Tỉnh và số điện thoại debounce 400 ms; mã giảm giá và giỏ áp dụng ngay.
  - `CheckoutSummary`: tạm tính, giảm giá, phí ship ("Miễn phí" khi `shippingFee − shippingDiscount = 0`), tổng,
    ưu đãi đã áp, gợi ý miễn ship, thời gian giao dự kiến.
  - `CouponBox`: mã chỉ được giữ sau khi preview thành công; lỗi hiện `title` của backend dưới ô nhập và không giữ mã.
    `couponApplied === false` hiện "Đã áp ưu đãi tốt nhất cho đơn của bạn". Mã bị từ chối ở lần tính lại (hết lượt…)
    cũng bị bỏ và báo dưới ô nhập.
  - Nút "Đặt hàng" khóa trong lúc số tiền đang được tính lại. Khi đặt gửi `couponCode` và `expectedTotal = preview.total`.
  - `CHECKOUT_TOTAL_CHANGED`, `PROMOTION_UNAVAILABLE`, `COUPON_*`: tính lại preview, đổi `Idempotency-Key`, giữ nguyên
    form để khách xem số mới rồi bấm đặt lần nữa.
  - `ADDRESS_NOT_SUPPORTED`: báo dưới ô tỉnh/thành và khóa nút đặt.
  - Ô tỉnh/thành là dropdown `ProvinceSelect` (`components/ProvinceSelect.tsx`) với 34 tỉnh (`PROVINCES` trong
    `@slvn/utils`), dùng chung với form địa chỉ ở sổ địa chỉ. Giá trị cũ không nằm trong danh sách (sổ địa chỉ lưu
    theo địa giới trước 07/2025) được giữ làm một lựa chọn thêm để không mất khi sửa.
- `/gio-hang`: `CartSummary` cũng dùng `POST /checkout/preview` (`source = cart`, chưa có tỉnh nên phí ship cố định);
  `POST /shipping/quote` chỉ còn dùng phía server để lấy ngưỡng miễn ship (`freeShippingThreshold` có thể `null`).
- `/khuyen-mai`: Server Component, `getActivePromotions()` (cache 60 s), `PromotionCard` cho từng chương trình. Hạn dùng
  lấy ngày của `endsAt` trừ 1 giây theo giờ Việt Nam. Lỗi tải hiện thông báo nhẹ, danh sách rỗng hiện trạng thái trống.
  Dưới danh sách có mục **Combo bộ sách** (`#combo`, `GET /combos`), ẩn khi không có combo (xem `storefront-combo.md`).
- Chi tiết đơn (`OrderDetails`): giảm giá theo dòng, "Giảm phí ship", danh sách ưu đãi đã áp.
- Danh sách ưu đãi đã áp (`CheckoutSummary`, `OrderDetails`) có thể gồm ưu đãi `kind = "combo"` (không giảm phí ship, không
  có mã). `promotionId` của combo là id combo nên `key` là `kind-promotionId`, tránh trùng với id chương trình.

## API backend sử dụng (method, route, mã lỗi được xử lý)

- `POST /checkout/preview`: `COUPON_INVALID`, `COUPON_EXPIRED`, `COUPON_MIN_ORDER`, `COUPON_NOT_APPLICABLE`,
  `COUPON_LOGIN_REQUIRED` (kèm link đăng nhập), `ADDRESS_NOT_SUPPORTED`, `TOO_MANY_REQUESTS`.
- `POST /orders`, `POST /orders/buy-now` (thêm `couponCode`, `expectedTotal`): `CHECKOUT_TOTAL_CHANGED`,
  `PROMOTION_UNAVAILABLE`, `COUPON_EXPIRED`, `IDEMPOTENCY_KEY_REUSED` và các mã cũ.
- `GET /promotions/active`, `POST /shipping/quote`.

## Cấu hình cần thiết (biến môi trường)

Không có biến mới.

## Hạn chế / việc còn lại

- `/checkout/preview` và `/promotions/active` đã có trong `openapi/v1.json` (bản đã sinh lại) nhưng OpenAPI của backend mô tả enum là
  `integer` nên vẫn khai báo tay ở `packages/api-client/src/pending-paths.ts`, response parse
  bằng Zod. Khi backend sinh OpenAPI đúng kiểu thì xóa khai báo tạm.
- Chưa ẩn COD theo `codAllowed` của preview và chưa xử lý riêng `TOO_MANY_OPEN_ORDERS` / `COD_NOT_ALLOWED` (422).
- Địa chỉ cũ lưu tên tỉnh theo địa giới trước 07/2025 vẫn hiện nguyên văn trong dropdown; chưa có bước chuyển
  sang tên tỉnh mới.
- Trang chi tiết sách chưa có khối "Phí ship dự kiến" (`POST /shipping/quote` kèm `province`).
