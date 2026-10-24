# Quản lý đơn hàng trên Admin

## Mục đích

Nhân viên tra cứu, lọc đơn và xử lý đơn thủ công theo bảng trạng thái mục 16.1 (FR-70): xác nhận, đóng gói, giao hàng, hủy,
hoàn tiền. Nghiệp vụ backend xem `docs/features/ordering.md`; phía khách xem `docs/features/storefront-ordering.md`.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **admin**, phần "Đơn hàng" (`lib/modules.ts`). Xem đơn: `super_admin`, `order_manager`, `customer_service`, `accountant`
(policy `orders_read`). Đổi trạng thái: chỉ `super_admin`, `order_manager` (`orders_manage`, `canManageOrders` trong
`lib/roles.ts`). Gõ thẳng URL khi không có vai trò thì `components/ModuleGate.tsx` hiện "Không có quyền truy cập".

| Route            | Màn hình                          | Component (`features/orders/`)      |
| ---------------- | --------------------------------- | ----------------------------------- |
| `/don-hang`      | Danh sách đơn, bộ lọc, phân trang | `OrderList`                         |
| `/don-hang/<mã>` | Chi tiết đơn, chuyển trạng thái   | `OrderDetail`, `OrderStatusActions` |

- **Bộ lọc** (form, bấm "Lọc" mới gọi API): trạng thái (15 trạng thái), thanh toán (COD, chuyển khoản), ngày đặt từ/đến
  (`dd/mm/yyyy`, giờ Việt Nam, tính cả hai đầu; chặn khoảng ngày ngược), mã đơn hoặc số điện thoại. Backend tìm **đúng**
  mã/số nên FE chuẩn hóa trước khi gửi (`normalizeOrderSearch`): số điện thoại bỏ khoảng trắng và dấu chấm, mã đơn viết hoa.
  "Xóa bộ lọc" chỉ hiện khi đang lọc.
- **Danh sách**: mã đơn (link), khách + SĐT, nhãn trạng thái (màu theo nhóm chờ / đang xử lý / đã giao / đã đóng / hủy),
  phương thức và tình trạng thanh toán, số cuốn, tổng tiền, ngày đặt. 20 đơn/trang.
- **Chi tiết**: khách (khách vãng lai hoặc "Tài khoản #id", có link sang chi tiết khách khi được vào phần Khách hàng), địa
  chỉ và ghi chú, thanh toán (hạn thanh toán khi đơn chuyển khoản đang chờ), hóa đơn công ty, sách (ấn bản · bìa · SKU ·
  ISBN), tiền lấy nguyên từ backend (tạm tính, giảm giá, phí ship, tổng), giá vốn hàng xuất (có từ khi đóng gói), dòng thời
  gian trạng thái.
- **Chuyển trạng thái**: nút dựng **từ `nextStatuses`** của backend (danh sách duy nhất backend chấp nhận). Chọn trạng thái
  thì mở form có câu hỏi xác nhận, tác động kèm theo (`transitionEffect`: đóng gói trừ tồn FIFO, hủy hoàn tồn, đã giao COD
  ghi thu tiền…) và ô ghi chú (không bắt buộc, ≤ 1000 ký tự, trống gửi `null`). Hủy đơn và hoàn tiền dùng nút đỏ. Thành
  công: thay cache đơn bằng response, làm mới danh sách, báo "Đã chuyển đơn sang …". Hết trạng thái kế tiếp thì báo "Đơn đã
  ở trạng thái cuối".
- **Xung đột**: người khác vừa đổi trạng thái (`ORDER_INVALID_TRANSITION`) thì đóng form, báo lỗi ở khung "Xử lý đơn" (vẫn
  còn sau khi tải lại) và tải lại đơn để dựng lại nút.
- Vai trò chỉ xem (CSKH, Kế toán) thấy câu "chỉ xem đơn", không có nút.

## API backend sử dụng (method, route, mã lỗi được xử lý)

Gọi qua `browserApi()` và proxy `/api/v1`. Response parse bằng Zod (`schemas.ts`); body đổi trạng thái có
`@ts-expect-error` cho `status` vì OpenAPI sinh enum `OrderStatus` thành `number` (`api.ts`).

| Method | Route                                                                   | Dùng cho          |
| ------ | ----------------------------------------------------------------------- | ----------------- |
| GET    | `/api/v1/admin/orders?Status=&PaymentMethod=&From=&To=&Q=&Page=&Limit=` | Danh sách, bộ lọc |
| GET    | `/api/v1/admin/orders/{code}`                                           | Chi tiết          |
| POST   | `/api/v1/admin/orders/{code}/status`                                    | `{status, note}`  |

Mã lỗi có câu chữ riêng (`lib/admin-errors.ts`): `ORDER_INVALID_TRANSITION`, `ORDER_NOT_PAID`; `NOT_FOUND` → "Không tìm
thấy đơn hàng này"; `FORBIDDEN`; lỗi 5xx kèm `traceId`.

## Cấu hình cần thiết (biến môi trường)

Không có biến mới. Dùng `API_BASE_URL`, `PROXY_SECRET` như `docs/features/admin-shell.md`.

## Hạn chế / việc còn lại

- **Chưa thử với backend thật**: luồng đã kiểm tra bằng Vitest + MSW và Playwright giả lập API.
- Bộ lọc và trang chưa lưu lên URL: quay lại từ chi tiết thì mất bộ lọc.
- Chưa in phiếu giao hàng/hóa đơn, chưa tạo vận đơn (FR-71), chưa tạo đơn thủ công (FR-72), chưa xuất Excel.
- Chưa hiện tên người đổi trạng thái trong dòng thời gian (API chưa trả).
- Kế toán chưa đổi được `paid` (backend chỉ cho `orders_manage`).
- Chưa có thông báo realtime khi có đơn mới; muốn thấy đơn mới thì tải lại trang.
