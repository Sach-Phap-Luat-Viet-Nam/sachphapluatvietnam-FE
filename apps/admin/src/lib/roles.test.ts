import { isStaff, staffRoleLabels } from "./roles";

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
