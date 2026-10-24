// Vai trò theo bảng enum ở docs/api_reference.md. Backend có thể thêm vai trò mới nên hàm nhận `string`.

/**
 * Vai trò nhân viên Super Admin cấp được trên trang quản trị. `super_admin` không cấp qua API (backend trả
 * `VALIDATION_ERROR`): chỉ 1–2 tài khoản, tạo từ cấu hình backend.
 */
export const ASSIGNABLE_STAFF_ROLES = [
  "product_manager",
  "order_manager",
  "warehouse_keeper",
  "customer_service",
  "marketing",
  "accountant",
] as const;
export type AssignableStaffRole = (typeof ASSIGNABLE_STAFF_ROLES)[number];

export const STAFF_ROLES = ["super_admin", ...ASSIGNABLE_STAFF_ROLES] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  product_manager: "Quản lý sản phẩm",
  order_manager: "Quản lý đơn",
  warehouse_keeper: "Thủ kho",
  customer_service: "CSKH",
  marketing: "Marketing",
  accountant: "Kế toán",
  customer: "Khách hàng",
};

/** Nhãn tiếng Việt của một vai trò; vai trò chưa biết thì giữ nguyên mã. */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/** Có ít nhất một vai trò nhân viên. Tài khoản chỉ có `customer` không được vào admin. */
export function isStaff(roles: readonly string[]): boolean {
  return roles.some((role) => role !== "customer");
}

// Quyền thao tác trong một phần quản trị (policy của backend, docs/features/auth.md). Chỉ để ẩn nút; backend vẫn kiểm tra.

/** Duyệt/từ chối phiếu nhập kho (policy `inventory_approve`). */
export function canApproveReceipts(roles: readonly string[]): boolean {
  return roles.includes("super_admin");
}

/** Đổi trạng thái đơn hàng (policy `orders_manage`); các vai trò còn lại của phần Đơn hàng chỉ xem. */
export function canManageOrders(roles: readonly string[]): boolean {
  return roles.includes("super_admin") || roles.includes("order_manager");
}

/** Xem danh sách sách (policy `catalog_admin`), cần để tìm SKU khi lập phiếu nhập hoặc mở thẻ kho. */
export function canBrowseCatalog(roles: readonly string[]): boolean {
  return roles.includes("super_admin") || roles.includes("product_manager");
}

/** Nhãn tiếng Việt của vai trò nhân viên, bỏ `customer`; vai trò chưa biết thì giữ nguyên mã. */
export function staffRoleLabels(roles: readonly string[]): string[] {
  return roles.filter((role) => role !== "customer").map(roleLabel);
}
