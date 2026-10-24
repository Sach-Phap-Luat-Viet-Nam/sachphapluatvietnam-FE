# Quản lý kho trên Admin

## Mục đích

Thủ kho lập phiếu nhập theo lô in, Super Admin duyệt thì tồn kho mới tăng (US-05). Nhân viên kho xem tồn thấp, thẻ kho
từng SKU (tồn, lô in, lịch sử nhập xuất), đặt ngưỡng cảnh báo và xuất thủ công (hủy hàng lỗi, biếu tặng). Nghiệp vụ backend
xem `docs/features/inventory.md`.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **admin**, phần "Kho" (`lib/modules.ts`, vai trò `super_admin`, `warehouse_keeper`). Gõ thẳng URL khi không có vai trò
thì `components/ModuleGate.tsx` hiện "Không có quyền truy cập"; backend vẫn kiểm tra quyền ở từng API.

| Route                     | Màn hình                                         | Component (`features/inventory/`) |
| ------------------------- | ------------------------------------------------ | --------------------------------- |
| `/kho`                    | Danh sách phiếu nhập, lọc trạng thái, phân trang | `ReceiptList`                     |
| `/kho/phieu-nhap/tao-moi` | Lập phiếu nhập nhiều dòng                        | `ReceiptCreate`, `SkuPicker`      |
| `/kho/phieu-nhap/<id>`    | Chi tiết phiếu, duyệt / từ chối                  | `ReceiptDetail`                   |
| `/kho/ton-thap`           | SKU có tồn khả dụng ≤ ngưỡng                     | `LowStockList`                    |
| `/kho/the-kho`            | Chọn SKU để mở thẻ kho                           | `StockCardLookup`                 |
| `/kho/the-kho/<skuId>`    | Thẻ kho, đặt ngưỡng, xuất thủ công               | `StockCardView`                   |

- **Lập phiếu**: mỗi dòng là một lô in gồm SKU, mã lô, xưởng in (không bắt buộc), số lượng, giá vốn/cuốn, ngày nhập
  (`dd/mm/yyyy`, mặc định hôm nay theo giờ Việt Nam, ô `components/DateInput.tsx`). Form chặn mã lô trùng trong cùng SKU
  (không phân biệt hoa thường) và hiện tổng số cuốn, tổng giá vốn. Lưu xong mở màn chi tiết phiếu. Lỗi theo dòng của backend
  (`lines[0].unitCost`) hiện đúng ô (`receiptFieldErrors`).
- **Chọn SKU** (`SkuPicker`): backend chưa có API tìm SKU nên tìm qua API Catalog: gõ tên/slug/ISBN (từ 2 ký tự, 8 kết quả)
  → chọn đầu sách → chọn SKU theo ấn bản và loại bìa. Nhãn SKU đã chọn: tên sách · ấn bản · loại bìa · mã SKU.
- **Duyệt phiếu**: chỉ `super_admin` thấy nút "Duyệt và nhập kho" (hỏi lại trước khi duyệt) và "Từ chối" (bắt buộc lý do).
  Người lập phiếu không thấy nút duyệt (backend trả `RECEIPT_SELF_APPROVAL`), vẫn từ chối được. Vai trò khác thấy câu "Phiếu
  đang chờ Super Admin duyệt". Duyệt/từ chối xong: thay cache phiếu bằng response, làm mới danh sách phiếu, tồn thấp, thẻ kho.
  Phiếu đã được người khác xử lý (`RECEIPT_NOT_DRAFT`) thì báo lỗi và tải lại phiếu.
- **Thẻ kho**: 4 ô số (khả dụng, đang giữ, thực có, ngưỡng), nhãn "Tồn thấp" khi khả dụng ≤ ngưỡng (SKU chưa từng nhập không
  tính, giống backend). Bảng lô in theo thứ tự xuất FIFO, lô hết hàng hiện mờ. Lịch sử 100 dòng gần nhất: số dương (xanh) là
  nhập, số âm (đỏ) là xuất; chứng từ `GR-{id}` có link sang phiếu nhập, mã đơn `SLVN…` có link sang đơn hàng khi người dùng
  được vào phần Đơn hàng.
- **Ngưỡng tồn thấp**: số nguyên 0–100.000. **Xuất thủ công**: loại (hủy hàng lỗi / biếu tặng), số lượng, lý do bắt buộc;
  vượt tồn khả dụng thì backend trả `OUT_OF_STOCK`. Ghi xong thay thẻ kho bằng response và làm mới tồn thấp.
- Người lập, người duyệt, người thao tác hiện dạng "Tài khoản #id" vì API chỉ trả id.

## API backend sử dụng (method, route, mã lỗi được xử lý)

Gọi qua `browserApi()` (Bearer, tự refresh khi 401) và proxy `/api/v1`. Response parse bằng Zod (`schemas.ts`) vì OpenAPI
sinh số thành `number | string`, enum thành `number`; body `issues` có `@ts-expect-error` cho field `type` (`api.ts`).

| Method   | Route                                                      | Dùng cho                    |
| -------- | ---------------------------------------------------------- | --------------------------- |
| GET      | `/api/v1/admin/inventory/receipts?Status=&Page=&Limit=`    | Danh sách phiếu             |
| GET/POST | `/api/v1/admin/inventory/receipts`, `/receipts/{id}`       | Lập phiếu, xem chi tiết     |
| POST     | `/api/v1/admin/inventory/receipts/{id}/approve`, `/reject` | Duyệt, từ chối (`{reason}`) |
| GET      | `/api/v1/admin/inventory/skus/{skuId}`                     | Thẻ kho                     |
| PUT      | `/api/v1/admin/inventory/skus/{skuId}/threshold`           | Đặt ngưỡng                  |
| GET      | `/api/v1/admin/inventory/low-stock?Page=&Limit=`           | Tồn thấp                    |
| POST     | `/api/v1/admin/inventory/issues`                           | Xuất hủy / biếu tặng        |
| GET      | `/api/v1/admin/books?Q=`, `/api/v1/admin/books/{id}`       | Tìm SKU (API Catalog)       |

Mã lỗi có câu chữ riêng (`lib/admin-errors.ts`): `RECEIPT_NOT_DRAFT`, `RECEIPT_SELF_APPROVAL`, `BATCH_CODE_DUPLICATE`,
`RECEIPT_EMPTY`, `OUT_OF_STOCK`; theo màn: `NOT_FOUND` (phiếu/SKU), `REFERENCE_NOT_FOUND` (SKU không còn), `FORBIDDEN` khi
tìm SKU; `VALIDATION_ERROR` theo ô; lỗi 5xx kèm `traceId`.

## Cấu hình cần thiết (biến môi trường)

Không có biến mới. Dùng `API_BASE_URL`, `PROXY_SECRET` như `docs/features/admin-shell.md`.

## Hạn chế / việc còn lại

- **Thủ kho chưa tìm được SKU**: tìm SKU đi qua API Catalog (policy `catalog_admin`: `super_admin`, `product_manager`), nên
  `warehouse_keeper` nhận 403 và màn hình báo "chưa được xem danh sách sách". Cần backend thêm API tìm SKU cho kho (hoặc mở
  quyền đọc Catalog cho `warehouse_keeper`); trong lúc chờ, Super Admin lập phiếu, thủ kho vẫn xem phiếu, tồn thấp và mở thẻ
  kho từ link mã SKU.
- **Chưa thử với backend thật**: luồng đã kiểm tra bằng Vitest + MSW và Playwright giả lập API.
- Chưa có màn danh sách toàn bộ tồn kho (backend chỉ có tồn thấp và thẻ kho từng SKU); chưa có kiểm kê, phiếu điều chỉnh.
- Chưa hiện tên người thao tác (API chỉ trả user id); chưa có tên sách trên thẻ kho và phiếu nhập (API chỉ trả mã SKU).
- Bộ lọc và trang của danh sách chưa lưu lên URL: quay lại từ màn chi tiết thì về trang 1.
- Chưa sửa/xóa được phiếu nháp (backend chưa có API); lập sai thì từ chối rồi lập phiếu mới.
