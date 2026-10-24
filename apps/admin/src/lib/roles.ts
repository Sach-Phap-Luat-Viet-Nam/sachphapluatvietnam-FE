// Vai trò theo bảng enum ở docs/api_reference.md. Backend có thể thêm vai trò mới nên hàm nhận `string`.

export const STAFF_ROLES = [
  "super_admin",
  "product_manager",
  "order_manager",
  "warehouse_keeper",
  "customer_service",
  "marketing",
  "accountant",
] as const;
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

/** Có ít nhất một vai trò nhân viên. Tài khoản chỉ có `customer` không được vào admin. */
export function isStaff(roles: readonly string[]): boolean {
  return roles.some((role) => role !== "customer");
}

/** Nhãn tiếng Việt của vai trò nhân viên, bỏ `customer`; vai trò chưa biết thì giữ nguyên mã. */
export function staffRoleLabels(roles: readonly string[]): string[] {
  return roles.filter((role) => role !== "customer").map((role) => ROLE_LABELS[role] ?? role);
}
