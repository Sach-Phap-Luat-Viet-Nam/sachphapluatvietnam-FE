# Quản lý nhân viên trên Admin

## Mục đích

Super Admin thêm tài khoản nhân viên, đổi vai trò, đặt mật khẩu mới, vô hiệu hóa/kích hoạt lại và đăng xuất hộ. Nghiệp vụ
và quy tắc backend xem `docs/features/auth.md` của repo backend (`AdminUsersController`); file này chỉ mô tả phần FE.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **admin**, phần "Nhân viên" (`lib/modules.ts`, chỉ `super_admin` theo policy `users_admin`). Gõ thẳng URL khi không
có vai trò thì `components/ModuleGate.tsx` (ở `app/(quan-tri)/nhan-vien/layout.tsx`) hiện "Không có quyền truy cập".

| Route        | Màn hình                                                 | Component (`features/users/`)    |
| ------------ | -------------------------------------------------------- | -------------------------------- |
| `/nhan-vien` | Danh sách nhân viên (phân trang) kèm mọi thao tác ở dưới | `UserList`, `UserForms` (3 form) |

- **Danh sách**: họ tên, email, vai trò, nhãn "Đã bật/Chưa bật 2FA", "Đã vô hiệu hóa", "Bạn" cho chính mình.
- **Thêm nhân viên**: email, họ tên, mật khẩu tạm (≥ 8 ký tự), ít nhất một vai trò nhân viên. Nhân viên phải tự bật 2FA ở
  lần đăng nhập đầu mới dùng được Admin; Super Admin tự báo mật khẩu tạm cho họ. Email trùng (`EMAIL_TAKEN`) hiện ngay ở
  ô email.
- **Đổi vai trò**: tích chọn vai trò nhân viên, gửi danh sách đầy đủ (`PUT .../roles` thay vai trò cũ). Vai trò ngoài danh
  sách nhân viên (ví dụ `customer`) được giữ nguyên (`toSetRolesBody`). Tự gỡ `super_admin` của chính mình bị backend từ
  chối (`CANNOT_REMOVE_OWN_ADMIN`).
- **Đặt mật khẩu**: Super Admin nhập mật khẩu mới (8–128 ký tự). Backend mở khóa tài khoản nếu đang bị khóa do sai mật
  khẩu và đăng xuất mọi thiết bị của người đó.
- **Vô hiệu hóa / Kích hoạt lại**: vô hiệu hóa có bước xác nhận; tài khoản bị đăng xuất và không đăng nhập lại được tới
  khi kích hoạt lại. Khác với khóa 15 phút do sai mật khẩu.
- **Đăng xuất hộ**: có bước xác nhận, báo số phiên đã thu hồi. Access token người đó đang cầm vẫn dùng được tối đa 15 phút.
- **Ẩn thao tác không hợp lệ**: không có "Đặt mật khẩu", "Vô hiệu hóa" với chính mình và Super Admin khác (`canManage`,
  backend vẫn kiểm tra và trả `CANNOT_MANAGE_USER`); không có "Đăng xuất hộ" với chính mình (sẽ tự đăng xuất).
- Sau mỗi thao tác ghi, danh sách được tải lại (`invalidateQueries`) và hiện thông báo kết quả ở đầu trang.

## API backend sử dụng (method, route, mã lỗi được xử lý)

Đều cần Bearer của Super Admin đã qua 2FA. Các route sau `/roles` chưa có trong OpenAPI đã sinh nên khai báo tạm ở
`packages/api-client/src/pending-paths.ts`; response parse bằng Zod (`features/users/schemas.ts`).

| Method | Route                          | Body / kết quả                                              |
| ------ | ------------------------------ | ----------------------------------------------------------- |
| GET    | `/admin/users?page=&limit=`    | Phân trang `UserResponse`, chỉ nhân viên                    |
| POST   | `/admin/users`                 | `{email, fullName, password, roles[]}` → 201 `UserResponse` |
| PUT    | `/admin/users/{id}/roles`      | `{roles[]}` → `UserResponse`                                |
| PUT    | `/admin/users/{id}/password`   | `{newPassword}` → 204                                       |
| POST   | `/admin/users/{id}/deactivate` | → `UserResponse` (`isActive: false`)                        |
| POST   | `/admin/users/{id}/activate`   | → `UserResponse` (`isActive: true`)                         |
| POST   | `/admin/users/{id}/logout`     | → `{revokedSessions}`                                       |

Mã lỗi có câu chữ riêng (`lib/admin-errors.ts`): `EMAIL_TAKEN`, `USER_NOT_FOUND`, `CANNOT_MANAGE_USER`,
`CANNOT_REMOVE_OWN_ADMIN`, `ROLE_INVALID`. Lỗi `VALIDATION_ERROR` hiện đúng ô.

## Cấu hình cần thiết (biến môi trường)

Không có biến riêng; dùng `API_BASE_URL` chung của admin (proxy `/api/v1/*`).

## Hạn chế / việc còn lại

- **Chưa có "Đăng nhập hộ"** (fast login, `POST /admin/users/{id}/impersonate`): cần trang `/impersonate` ở cả admin và
  storefront, banner cảnh báo và đồng hồ đếm ngược, xem `docs/features/fast-login-super-admin.md`.
- `GET /admin/users` chỉ liệt kê nhân viên, chưa tìm được khách hàng nên chưa vô hiệu hóa hay đặt mật khẩu cho khách ở đây.
- Danh sách chưa có tìm kiếm hay lọc theo vai trò/trạng thái.
- `isActive` chỉ có từ bản backend thêm vô hiệu hóa tài khoản; backend cũ chưa trả thì FE coi mọi tài khoản đang hoạt
  động, nhưng gọi `deactivate`/`activate` sẽ 404 cho tới khi backend cập nhật.
- Chưa có nhật ký thao tác xem được trên giao diện (backend mới ghi log).
- Chưa thử với backend thật; test dùng MSW.

## Kiểm tra

Unit test: schema form (thêm nhân viên, đặt mật khẩu, đổi vai trò), chuẩn hóa body, giữ vai trò ngoài danh sách nhân
viên, `canManage`, `isActive` thiếu thì mặc định `true`. Component test (MSW): danh sách và thao tác bị ẩn với chính mình
và Super Admin, thêm nhân viên (kiểm tra lỗi, email trùng, body), đổi vai trò, đặt mật khẩu, vô hiệu hóa rồi kích hoạt
lại, đăng xuất hộ, lỗi từ backend.
