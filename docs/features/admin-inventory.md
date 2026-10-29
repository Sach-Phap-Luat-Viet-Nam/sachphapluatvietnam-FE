# Quản lý kho trên Admin

## Mục đích

Thủ kho lập phiếu nhập theo lô in (thường 4–5 dòng, mỗi sách một SKU), Super Admin duyệt thì tồn kho mới tăng (US-05). Nhân viên kho xem tồn thấp, thẻ kho
từng SKU (tồn, lô in, lịch sử nhập xuất), đặt ngưỡng cảnh báo và xuất thủ công (hủy hàng lỗi, biếu tặng). Nghiệp vụ backend
xem `docs/features/inventory.md`.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **admin**, phần "Kho" (`lib/modules.ts`, vai trò `super_admin`, `warehouse_keeper`). Gõ thẳng URL khi không có vai trò
thì `components/ModuleGate.tsx` hiện "Không có quyền truy cập"; backend vẫn kiểm tra quyền ở từng API.

| Route                      | Màn hình                                         | Component (`features/inventory/`) |
| -------------------------- | ------------------------------------------------ | --------------------------------- |
| `/kho`                     | Danh sách phiếu nhập, lọc trạng thái, phân trang | `ReceiptList`                     |
| `/kho/phieu-nhap/tao-moi`  | Lập phiếu nhập nhiều dòng                        | `ReceiptCreate`, `SkuPicker`      |
| `/kho/phieu-nhap/<id>`     | Chi tiết phiếu, duyệt / từ chối / sửa / xóa      | `ReceiptDetail`                   |
| `/kho/phieu-nhap/<id>/sua` | Sửa phiếu nháp (cùng form với lập phiếu)         | `ReceiptEdit`, `ReceiptForm`      |
| `/kho/ton-thap`            | SKU có tồn khả dụng ≤ ngưỡng                     | `LowStockList`                    |
| `/kho/the-kho`             | Chọn SKU để mở thẻ kho                           | `StockCardLookup`                 |
| `/kho/the-kho/<skuId>`     | Thẻ kho, đặt ngưỡng, xuất thủ công               | `StockCardView`                   |

- **Lập phiếu** (`ReceiptForm`, dùng chung cho lập mới và sửa nháp): mỗi dòng là một lô in gồm SKU, mã lô, xưởng in
  (không bắt buộc), số lượng, giá vốn/cuốn, ngày nhập (`dd/mm/yyyy`, mặc định hôm nay theo giờ Việt Nam, ô
  `components/DateInput.tsx`). Form chặn mã lô trùng trong cùng SKU (không phân biệt hoa thường) và hiện tổng số cuốn,
  tổng giá vốn. Lưu xong mở màn chi tiết phiếu. Lỗi theo dòng của backend (`lines[0].unitCost`) hiện đúng ô
  (`receiptFieldErrors`). Thao tác nhanh cho phiếu vài dòng:
  - **Thêm dòng** giữ xưởng in và ngày nhập của dòng trước (`nextReceiptLine`), con trỏ nhảy vào ô tìm SKU của dòng mới.
  - **Nhân bản** dòng (`duplicateReceiptLine`) giữ SKU, xưởng in, giá vốn, ngày nhập; bỏ mã lô và số lượng (lô mới phải
    khác mã), con trỏ nhảy vào ô Mã lô.
  - Dưới ô Mã lô có **nút gợi ý** `LO-yyMMdd` (theo ngày) và `LO-yyyy-MM` (theo tháng) theo ngày nhập của dòng, bấm là điền
    (`batchCodeSuggestions`).
  - Chọn SKU xong thì **gợi ý mã lô** `LO-yyMMdd` theo ngày nhập (`suggestBatchCode`, chỉ khi ô còn trống, đã chọn sẵn
    để gõ đè) và con trỏ nhảy sang ô Mã lô.
- **Chọn SKU** (`SkuPicker`): **một bước**, gõ một phần tên sách, mã SKU hoặc ISBN (từ 2 ký tự, 8 kết quả) qua
  `GET /admin/inventory/sku-search`; mỗi kết quả là một SKU kèm ấn bản, loại bìa và **tồn khả dụng**, bấm chọn là xong.
  **Enter** chọn kết quả đầu tiên (hỏi theo đúng chuỗi đang gõ, không chờ debounce, và không gửi form), mũi tên xuống
  chuyển vào danh sách. API này mở cho cả thủ kho nên **thủ kho tự lập phiếu được**, không cần quyền Catalog. Nhãn SKU
  đã chọn: tên sách · ấn bản · loại bìa · mã SKU. Cũng dùng ở màn mở thẻ kho (`StockCardLookup`).
- **Sửa và xóa phiếu nháp**: ở chi tiết phiếu, người lập hoặc Super Admin thấy "Sửa phiếu" (mở `/kho/phieu-nhap/<id>/sua`,
  `PUT /receipts/{id}`, thay ghi chú và toàn bộ dòng) và "Xóa phiếu" (hỏi lại, `DELETE /receipts/{id}`, về danh sách).
  Phiếu đã duyệt hoặc từ chối không sửa, xóa được (`RECEIPT_NOT_DRAFT`); người khác nhận `RECEIPT_FORBIDDEN`.
- **Duyệt phiếu**: chỉ `super_admin` thấy nút "Duyệt và nhập kho" (hỏi lại trước khi duyệt) và "Từ chối" (bắt buộc lý do).
  Super Admin **duyệt được mọi phiếu, kể cả phiếu do chính mình lập**. Vai trò khác thấy câu "Phiếu đang chờ Super Admin
  duyệt". Duyệt/từ chối xong: thay cache phiếu bằng response, làm mới danh sách phiếu, tồn thấp, thẻ kho.
  Phiếu đã được người khác xử lý (`RECEIPT_NOT_DRAFT`) thì báo lỗi và tải lại phiếu.
- **Thẻ kho**: 4 ô số (khả dụng, đang giữ, thực có, ngưỡng), nhãn "Tồn thấp" khi khả dụng ≤ ngưỡng (SKU chưa từng nhập không
  tính, giống backend). Bảng lô in theo thứ tự xuất FIFO, lô hết hàng hiện mờ. Lịch sử 100 dòng gần nhất: số dương (xanh) là
  nhập, số âm (đỏ) là xuất; chứng từ `GR-{id}` có link sang phiếu nhập, mã đơn `SLVN…` có link sang đơn hàng khi người dùng
  được vào phần Đơn hàng.
- **Ngưỡng tồn thấp**: số nguyên 0–100.000. **Xuất thủ công**: loại (hủy hàng lỗi / biếu tặng), số lượng, lý do bắt buộc;
  vượt tồn khả dụng thì backend trả `OUT_OF_STOCK`. Ghi xong thay thẻ kho bằng response và làm mới tồn thấp.
- **Tên hiển thị**: phiếu, dòng phiếu và thẻ kho hiện **tên sách** (và ấn bản, loại bìa) cùng **tên người lập/duyệt/thao tác** do backend
  trả (`bookTitle`, `createdByName`, ...); chưa có tên (API cũ) thì dùng mã SKU hoặc "Tài khoản #id". Danh sách phiếu có thêm cột
  Sách ("Bộ luật … (+2)") và Người lập; thẻ kho có cột Người thao tác.

## API backend sử dụng (method, route, mã lỗi được xử lý)

Gọi qua `browserApi()` (Bearer, tự refresh khi 401) và proxy `/api/v1`. Response parse bằng Zod (`schemas.ts`) vì OpenAPI
sinh số thành `number | string`, enum thành `number`; body `issues` có `@ts-expect-error` cho field `type` (`api.ts`).

| Method         | Route                                                      | Dùng cho                    |
| -------------- | ---------------------------------------------------------- | --------------------------- |
| GET            | `/api/v1/admin/inventory/receipts?Status=&Page=&Limit=`    | Danh sách phiếu             |
| GET/POST       | `/api/v1/admin/inventory/receipts`                         | Danh sách, lập phiếu        |
| GET/PUT/DELETE | `/api/v1/admin/inventory/receipts/{id}`                    | Xem, sửa, xóa phiếu nháp    |
| GET            | `/api/v1/admin/inventory/sku-search?Q=&Limit=`             | Tìm SKU (thủ kho dùng được) |
| POST           | `/api/v1/admin/inventory/receipts/{id}/approve`, `/reject` | Duyệt, từ chối (`{reason}`) |
| GET            | `/api/v1/admin/inventory/skus/{skuId}`                     | Thẻ kho                     |
| PUT            | `/api/v1/admin/inventory/skus/{skuId}/threshold`           | Đặt ngưỡng                  |
| GET            | `/api/v1/admin/inventory/low-stock?Page=&Limit=`           | Tồn thấp                    |
| POST           | `/api/v1/admin/inventory/issues`                           | Xuất hủy / biếu tặng        |

Mã lỗi có câu chữ riêng (`lib/admin-errors.ts`): `RECEIPT_NOT_DRAFT`, `RECEIPT_FORBIDDEN`, `BATCH_CODE_DUPLICATE`,
`RECEIPT_EMPTY`, `OUT_OF_STOCK`; theo màn: `NOT_FOUND` (phiếu/SKU), `REFERENCE_NOT_FOUND` (SKU không còn), `FORBIDDEN` khi
tìm SKU; `VALIDATION_ERROR` theo ô; lỗi 5xx kèm `traceId`.

## Cấu hình cần thiết (biến môi trường)

Không có biến mới. Dùng `API_BASE_URL`, `PROXY_SECRET` như `docs/features/admin-shell.md`.

## Hạn chế / việc còn lại

- **Chưa thử với backend thật**: luồng đã kiểm tra bằng Vitest + MSW và Playwright giả lập API.
- Chưa có màn danh sách toàn bộ tồn kho (backend chỉ có tồn thấp và thẻ kho từng SKU); chưa có kiểm kê, phiếu điều chỉnh.
- Chưa hiện tên người thao tác (API chỉ trả user id); chưa có tên sách trên thẻ kho và phiếu nhập (API chỉ trả mã SKU).
- Bộ lọc và trang của danh sách chưa lưu lên URL: quay lại từ màn chi tiết thì về trang 1.
- Route `sku-search`, `PUT/DELETE receipts/{id}` khai báo ở `pending-paths.ts` (chưa có trong OpenAPI sinh ra); cần deploy backend mới.
- Chưa có import Excel phiếu nhập; chưa có màn tồn kho tổng.
