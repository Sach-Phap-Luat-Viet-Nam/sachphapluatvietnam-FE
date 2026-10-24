import { canApproveReceipts, canBrowseCatalog, canManageOrders, isStaff, staffRoleLabels } from "./roles";

describe("quyền thao tác", () => {
  it("chỉ Super Admin duyệt phiếu nhập", () => {
    expect(canApproveReceipts(["super_admin"])).toBe(true);
    expect(canApproveReceipts(["warehouse_keeper"])).toBe(false);
  });

  it("Super Admin và Quản lý đơn đổi trạng thái đơn, CSKH và Kế toán chỉ xem", () => {
    expect(canManageOrders(["order_manager"])).toBe(true);
    expect(canManageOrders(["super_admin"])).toBe(true);
    expect(canManageOrders(["customer_service", "accountant"])).toBe(false);
  });

  it("chỉ vai trò Catalog tìm được sách", () => {
    expect(canBrowseCatalog(["product_manager"])).toBe(true);
    expect(canBrowseCatalog(["warehouse_keeper"])).toBe(false);
  });
});

describe("isStaff", () => {
  it("chỉ nhận tài khoản có vai trò nhân viên", () => {
    expect(isStaff(["customer"])).toBe(false);
    expect(isStaff([])).toBe(false);
    expect(isStaff(["customer", "marketing"])).toBe(true);
  });
});

describe("staffRoleLabels", () => {
  it("dùng nhãn tiếng Việt, bỏ customer và giữ mã vai trò chưa biết", () => {
    expect(staffRoleLabels(["warehouse_keeper", "customer", "new_role"])).toEqual(["Thủ kho", "new_role"]);
  });
});
