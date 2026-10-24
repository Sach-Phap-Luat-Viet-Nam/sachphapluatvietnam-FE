# Trang tài khoản và sổ địa chỉ trên storefront

## Mục đích

Thành viên tự sửa hồ sơ (FR-05) và lưu địa chỉ giao hàng (FR-06) để lần sau đặt sách không phải nhập lại. Đặc tả
backend ở `docs/features/auth.md` của repo backend (`MeController`); file này chỉ mô tả phần FE.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **storefront**, route `/tai-khoan` (`noindex`). Code ở `features/account`; phần gọi API và hook dùng chung với form
đặt hàng nằm ở `lib/account-api.ts`, `lib/use-account.ts`.

- Bố cục: khối hồ sơ ở đầu trang (ảnh đại diện 152 px có quầng sáng, họ tên, email, đổi/xóa ảnh, lối tắt tới đơn hàng và
  khuyến mãi), bên dưới là hai khối "Thông tin cá nhân" và "Sổ địa chỉ".
- Dữ liệu cần access token trong bộ nhớ trình duyệt nên trang tải ở client. Chưa đăng nhập thì hiện "Đăng nhập để xem
  tài khoản" (link `/dang-nhap?next=%2Ftai-khoan`).
- Query key gắn với người dùng đang đăng nhập (`["account", <user>, ...]`) để đổi tài khoản trong cùng trình duyệt không
  lẫn dữ liệu.

### Thông tin cá nhân

- Email (chỉ xem), họ tên, số điện thoại, ngày sinh, nghề nghiệp (`student`, `lawyer`, `accountant`, `other`).
- `PATCH /me` luôn gửi đủ 4 field; ô để trống gửi `null` (xóa giá trị cũ). Số điện thoại chuẩn hóa về `0xxxxxxxxx`.
- **Ngày sinh nhập dạng `dd/mm/yyyy`** bằng ô chữ, tự chèn `/` khi gõ (`20051995` → `20/05/1995`). Không dùng
  `<input type="date">` vì ô này hiện theo ngôn ngữ trình duyệt (có máy hiện `mm/dd/yyyy`). Báo lỗi với ngày không có
  thật (`31/04`, `29/02/2001`) và ngày trong tương lai; gửi API dạng `YYYY-MM-DD`.
- Đổi họ tên thì refresh phiên để tên trên header cập nhật theo.
- Lỗi `VALIDATION_ERROR` của backend hiện đúng ô (tên field trùng `UpdateProfileRequest`).

### Sổ địa chỉ

- Tối đa **10** địa chỉ, sổ không rỗng luôn có đúng một địa chỉ mặc định (quy tắc `AddressBook` của backend). Địa chỉ
  mặc định đứng đầu, rồi đến địa chỉ cập nhật gần nhất (backend sắp sẵn).
- Thêm địa chỉ: người nhận, số điện thoại điền sẵn từ hồ sơ. Địa chỉ đầu tiên tự là mặc định.
- Sửa, "Đặt làm mặc định", xóa (có bước xác nhận). Xóa địa chỉ mặc định thì backend chuyển mặc định sang địa chỉ cập
  nhật gần nhất còn lại.
- Đủ 10 địa chỉ thì khóa nút "Thêm địa chỉ" và nhắc xóa bớt.
- API thêm, sửa, đặt mặc định trả **cả sổ**: thay cache bằng response, tải lại hồ sơ (vì `defaultAddress` đổi). Lỗi thì
  tải lại sổ cho khớp backend (ví dụ địa chỉ vừa bị xóa ở tab khác).
- Backend chưa có API (404 không kèm `ADDRESS_NOT_FOUND`): hiện "Sổ địa chỉ đang được hoàn thiện", không báo lỗi.

### Dùng ở form đặt hàng

Xem mục "Đặt hàng `/thanh-toan`" trong `docs/features/storefront-ordering.md`: chọn địa chỉ đã lưu, điền sẵn địa chỉ mặc
định, tích "Lưu địa chỉ này vào sổ địa chỉ".

## API backend sử dụng (method, route, mã lỗi được xử lý)

Đều cần Bearer.

| Method | Route                        | Body / Response                                                              |
| ------ | ---------------------------- | ---------------------------------------------------------------------------- |
| GET    | `/me`                        | → `MeResponse` (hồ sơ + `defaultAddress`, `invoiceInfo`, `null` khi chưa có) |
| PATCH  | `/me`                        | `UpdateProfileRequest` → `MeResponse`                                        |
| GET    | `/me/addresses`              | → `AddressResponse[]`                                                        |
| POST   | `/me/addresses`              | `UpsertAddressRequest` → 201 `AddressResponse[]` (cả sổ)                     |
| PUT    | `/me/addresses/{id}`         | `UpsertAddressRequest` → `AddressResponse[]`                                 |
| POST   | `/me/addresses/{id}/default` | → `AddressResponse[]`                                                        |
| DELETE | `/me/addresses/{id}`         | → 204                                                                        |
| PUT    | `/me/invoice-info`           | `UpsertInvoiceInfoRequest` → `InvoiceInfoResponse`                           |
| DELETE | `/me/invoice-info`           | → 204                                                                        |

- `UpsertAddressRequest`: `{recipientName, phone, province, ward, streetAddress, isDefault}`. `isDefault: false` không
  bỏ được cờ mặc định.
- `UpsertInvoiceInfoRequest`: `{companyName, taxCode, address, email}`; mã số thuế kiểm tra bằng `lib/tax-code.ts` (giống
  `AuthRules.TaxCodePattern` của backend), dùng chung với form đặt hàng.
- Mã lỗi: `ADDRESS_NOT_FOUND` (404, kể cả địa chỉ của người khác), `ADDRESS_LIMIT_REACHED` (422), `VALIDATION_ERROR`
  (map về ô). Thông báo hiện theo `title` tiếng Việt của backend.
- Các route trên chưa có trong OpenAPI đã sinh, khai báo tạm ở `packages/api-client/src/pending-paths.ts`; response parse
  bằng Zod.

## Cấu hình cần thiết (biến môi trường)

Không có biến riêng; dùng `API_BASE_URL` chung của storefront (proxy `/api/v1/*`).

## Hạn chế / việc còn lại

- Backend bản cũ trả `/me` chưa có `defaultAddress`, `invoiceInfo`: FE coi như `null` để trang không lỗi.
- Chưa có giao diện xem/sửa/xóa **thông tin xuất hóa đơn** ở trang tài khoản (API và hook `useSaveInvoiceInfo` đã có).
- Form đặt hàng chưa điền sẵn phần hóa đơn từ `invoiceInfo`, chưa có checkbox lưu thông tin hóa đơn.
- Tỉnh/thành, phường/xã là ô nhập tự do (chưa có danh mục địa giới 2 cấp).
- Chưa thử trên trình duyệt với backend thật; test dùng MSW (`src/mocks/address-handlers.ts` làm theo quy tắc
  `AddressBook` của backend).

## Kiểm tra

Unit test: schema form hồ sơ và địa chỉ, đọc/ghi ngày sinh `dd/mm/yyyy`, tự chèn `/`, parse `MeResponse` thiếu field
mới. Component test (MSW): lưu hồ sơ (gõ ngày sinh, body gửi đủ 4 field), thêm/đặt mặc định/xóa địa chỉ, backend chưa
có API sổ địa chỉ, chưa đăng nhập.
