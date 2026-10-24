import type { StaffRole } from "./roles";

export type AdminModuleId =
  "overview" | "catalog" | "content" | "promotions" | "inventory" | "orders" | "shipping" | "users" | "customers";

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

// Khuyến mãi và Vận chuyển theo docs/features/checkout-promotion-shipping.md, mục 7.
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
    id: "promotions",
    href: "/khuyen-mai",
    label: "Khuyến mãi",
    description: "Chương trình giảm giá đơn, miễn phí vận chuyển và mã giảm giá: lịch chạy, điều kiện, thống kê.",
    roles: ["super_admin", "product_manager", "marketing"],
    ready: true,
  },
  {
    id: "inventory",
    href: "/kho",
    label: "Kho",
    description: "Lập và duyệt phiếu nhập, tồn thấp, thẻ kho theo lô in, xuất hủy hàng lỗi và biếu tặng.",
    roles: ["super_admin", "warehouse_keeper"],
    ready: true,
  },
  {
    id: "orders",
    href: "/don-hang",
    label: "Đơn hàng",
    description: "Tra cứu, lọc đơn và chuyển trạng thái: xác nhận, đóng gói, giao hàng, hủy, hoàn tiền.",
    roles: ["super_admin", "order_manager", "customer_service", "accountant"],
    ready: true,
  },
  {
    id: "shipping",
    href: "/van-chuyen",
    label: "Vận chuyển",
    description: "Vùng giao hàng, biểu phí theo trọng lượng, ngưỡng miễn phí vận chuyển.",
    roles: ["super_admin", "order_manager"],
    ready: true,
  },
  {
    id: "users",
    href: "/nhan-vien",
    label: "Nhân viên",
    description: "Tài khoản nhân viên: thêm mới, phân quyền, đặt mật khẩu, vô hiệu hóa, đăng xuất và đăng nhập hộ.",
    roles: ["super_admin"],
    ready: true,
  },
  {
    id: "customers",
    href: "/khach-hang",
    label: "Khách hàng",
    description: "Tra cứu khách hàng, sổ địa chỉ, vô hiệu hóa tài khoản và đăng nhập hộ để hỗ trợ.",
    roles: ["super_admin"],
    ready: true,
  },
];

/** Các phần quản trị người dùng được vào, theo `user.roles` (backend vẫn kiểm tra lại quyền ở từng API). */
export function modulesForRoles(roles: readonly string[]): AdminModule[] {
  return ADMIN_MODULES.filter((module) => module.roles === null || module.roles.some((role) => roles.includes(role)));
}
