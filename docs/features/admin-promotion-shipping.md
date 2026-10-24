# Admin: khuyến mãi và vận chuyển

Hợp đồng API: `docs/features/checkout-promotion-shipping.md`, mục 7. File này mô tả phần giao diện Admin.

## Mục đích

- **Khuyến mãi**: tạo và theo dõi chương trình giảm giá đơn, giảm/miễn phí vận chuyển, quản lý mã giảm giá.
- **Vận chuyển**: cấu hình ngưỡng miễn phí vận chuyển và các vùng giao hàng (biểu phí theo trọng lượng).

## Luồng xử lý (màn hình, route, app storefront/admin)

App `admin`, cần đăng nhập nhân viên đã bật 2FA. Hai phần mới trong menu (`lib/modules.ts`):

| Phần       | Route                                                    | Vai trò                                       |
| ---------- | -------------------------------------------------------- | --------------------------------------------- |
| Khuyến mãi | `/khuyen-mai`, `/khuyen-mai/tao-moi`, `/khuyen-mai/[id]` | `super_admin`, `product_manager`, `marketing` |
| Vận chuyển | `/van-chuyen`                                            | `super_admin`, `order_manager`                |

### Khuyến mãi

- `/khuyen-mai`: danh sách phân trang, tìm theo tên (debounce), badge trạng thái (`inactive | scheduled | running | ended |
exhausted`), sửa, xóa mềm.
- `/khuyen-mai/tao-moi`, `/khuyen-mai/[id]`: `PromotionForm`. Có chú thích "mỗi đơn tối đa một chương trình giảm đơn và một
  chương trình giảm phí ship, không cộng dồn". Ràng buộc áp ngay ở form và body (`promotion-form.ts`):
  - giảm theo % chỉ 1–100, có thể kèm trần; giảm cố định là số nguyên > 0 (trần bị bỏ);
  - miễn/giảm phí ship luôn `scopeType = all`, `excludeOnSaleItems = false` (phần phạm vi bị khóa);
  - `scopeType ≠ all` bắt buộc 1–500 ID (nhập dạng danh sách, cách nhau bằng dấu phẩy/xuống dòng);
  - ngày giờ nhập theo giờ Việt Nam, gửi kèm offset `+07:00`; "đến hết 31/12/2026" nhập `01/01/2027 00:00`.
  - Tạo chương trình `mode = coupon` xong thì mở trang sửa để thêm mã.
- Trang sửa còn có `PromotionStatsPanel` (lượt dùng, lượt hoàn, số khách, tổng tiền giảm) và, với `mode = coupon`,
  `CouponManager`: thêm một mã, sinh hàng loạt (hiện danh sách để sao chép), bật/tắt từng mã.

### Vận chuyển

- `/van-chuyen`: `ShippingManager` gồm cấu hình chung (`SettingsForm`; ngưỡng để trống = tắt) và danh sách vùng.
- `ZoneForm`: tên, thứ tự, bật/tắt, chọn tỉnh từ danh sách 34 tỉnh (`ProvincePicker`; tỉnh đã thuộc vùng khác bị khóa),
  biểu phí, thời gian giao. Có ô "Tính thử" (chỉ minh họa, ví dụ 1.900 g với biểu phí mặc định → 30.000 ₫).
- Cảnh báo vận hành: khi tạo vùng đầu tiên, và khi còn tỉnh chưa thuộc vùng nào đang bật (khách ở đó sẽ gặp
  `ADDRESS_NOT_SUPPORTED`).

## API backend sử dụng (method, route, mã lỗi được xử lý)

- Khuyến mãi: `GET/POST /admin/promotions`, `GET/PUT/DELETE /admin/promotions/{id}`, `GET /admin/promotions/{id}/stats`,
  `GET/POST /admin/promotions/{id}/coupons`, `POST /admin/promotions/{id}/coupons/generate`, `PUT /admin/coupons/{id}`.
  Mã lỗi: `VALIDATION_ERROR` (map về field), `COUPON_CODE_DUPLICATE`, `PROMOTION_NOT_COUPON`, `FORBIDDEN`.
- Vận chuyển: `GET/POST /admin/shipping/zones`, `PUT/DELETE /admin/shipping/zones/{id}`,
  `GET/PUT /admin/shipping/settings`. Mã lỗi: `SHIPPING_PROVINCE_DUPLICATE`, `VALIDATION_ERROR`, `FORBIDDEN`.

## Cấu hình cần thiết (biến môi trường)

Không có biến mới.

## Hạn chế / việc còn lại

- Các route trên chưa có trong `openapi/v1.json`: khai báo tạm ở `packages/api-client/src/pending-paths.ts`, response
  parse bằng Zod. Sau `pnpm api:fetch && pnpm api:generate` thì xóa khai báo tạm.
- Doc backend chưa mô tả response của `/coupons`, `/coupons/generate` và `GET /admin/shipping/zones`: FE đang giả định
  mã có `{ id, code, usageLimit, usedCount, isActive }` (thiếu field thì mặc định), danh sách là mảng hoặc `{ items }`,
  sinh hàng loạt trả mảng mã (chuỗi hoặc `{ code }`). Cần đối chiếu với backend thật.
- `GET /admin/shipping/zones/{id}` không có trong doc nên sửa vùng dùng dữ liệu từ danh sách.
- Phạm vi theo sách/SKU/danh mục nhập bằng ID; chưa có bộ chọn trực quan.
- Chưa có phân quyền ẩn nút theo vai trò trong từng phần (backend vẫn kiểm tra ở mỗi API).
