import type { StaffRole } from "./roles";

export type AdminModuleId = "overview" | "catalog" | "content" | "inventory" | "orders" | "users";

export interface AdminModule {
  id: AdminModuleId;
  href: string;
  label: string;
  description: string;
  /** `null`: mọi nhân viên đều vào được. */
  roles: readonly StaffRole[] | null;
  /** Màn hình đã làm chưa. Chưa làm thì menu hiện "Sắp có", không tạo link tới trang 404. */
  ready: boolean;
}

// Quyền theo bảng "Admin — người dùng và phân quyền" trong docs/api_reference.md; "Nội dung" theo policy
// `content_admin` trong docs/features/popup.md.
export const ADMIN_MODULES: readonly AdminModule[] = [
  {
    id: "overview",
    href: "/",
    label: "Tổng quan",
    description: "Lối tắt tới các phần anh/chị được giao.",
    roles: null,
    ready: true,
  },
  {
    id: "catalog",
    href: "/sach",
    label: "Sách",
    description: "Đầu sách, ấn bản, SKU, danh mục, tác giả, văn bản pháp luật.",
    roles: ["super_admin", "product_manager"],
    ready: true,
  },
  {
    id: "content",
    href: "/noi-dung/popup",
    label: "Nội dung",
    description: "Popup quảng cáo trên website: ảnh, link, lịch chạy và tần suất hiển thị.",
    roles: ["super_admin", "marketing"],
    ready: true,
  },
  {
    id: "inventory",
    href: "/kho",
    label: "Kho",
    description: "Phiếu nhập, xuất hủy, biếu tặng và tồn kho theo lô.",
    roles: ["super_admin", "warehouse_keeper"],
    ready: false,
  },
  {
    id: "orders",
    href: "/don-hang",
    label: "Đơn hàng",
    description: "Xem và xử lý đơn: xác nhận, đóng gói, giao hàng.",
    roles: ["super_admin", "order_manager", "customer_service", "accountant"],
    ready: false,
  },
  {
    id: "users",
    href: "/nhan-vien",
    label: "Nhân viên",
    description: "Tài khoản nhân viên: thêm mới, phân quyền, đặt mật khẩu, vô hiệu hóa và đăng xuất hộ.",
    roles: ["super_admin"],
    ready: true,
  },
];

/** Các phần quản trị người dùng được vào, theo `user.roles` (backend vẫn kiểm tra lại quyền ở từng API). */
export function modulesForRoles(roles: readonly string[]): AdminModule[] {
  return ADMIN_MODULES.filter((module) => module.roles === null || module.roles.some((role) => roles.includes(role)));
}
