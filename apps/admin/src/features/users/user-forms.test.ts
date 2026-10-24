import { createStaffFormSchema, resetPasswordFormSchema, rolesFormSchema, staffUserSchema } from "./schemas";
import { canManage, staffRolesOf, toCreateStaffBody, toSetRolesBody } from "./user-forms";

describe("staffUserSchema", () => {
  it("coi tài khoản là đang hoạt động khi backend chưa trả isActive", () => {
    const user = staffUserSchema.parse({
      id: 3,
      email: "kho@sachluat.vn",
      fullName: "Thủ kho",
      roles: ["warehouse_keeper"],
      twoFactorEnabled: false,
      requiresTwoFactorSetup: true,
    });
    expect(user.isActive).toBe(true);
  });
});

describe("form thêm nhân viên", () => {
  const valid = {
    email: "kho@sachluat.vn",
    fullName: "Thủ kho",
    password: "mat-khau-tam",
    roles: ["warehouse_keeper"],
  };

  it("hợp lệ khi đủ email, họ tên, mật khẩu 8+ ký tự và một vai trò", () => {
    expect(createStaffFormSchema.safeParse(valid).success).toBe(true);
  });

  it("từ chối email sai, mật khẩu ngắn, chưa chọn vai trò và vai trò không phải nhân viên", () => {
    expect(createStaffFormSchema.safeParse({ ...valid, email: "khong-hop-le" }).success).toBe(false);
    expect(createStaffFormSchema.safeParse({ ...valid, password: "1234567" }).success).toBe(false);
    expect(createStaffFormSchema.safeParse({ ...valid, roles: [] }).success).toBe(false);
    expect(createStaffFormSchema.safeParse({ ...valid, roles: ["customer"] }).success).toBe(false);
  });

  it("chuẩn hóa email chữ thường và bỏ khoảng trắng thừa ở họ tên", () => {
    const body = toCreateStaffBody({
      ...valid,
      email: "Kho@SachLuat.vn",
      fullName: "  Thủ kho ",
      roles: ["warehouse_keeper" as const],
    });
    expect(body).toMatchObject({ email: "kho@sachluat.vn", fullName: "Thủ kho" });
  });
});

describe("form đặt mật khẩu và đổi vai trò", () => {
  it("mật khẩu mới từ 8 đến 128 ký tự", () => {
    expect(resetPasswordFormSchema.safeParse({ newPassword: "12345678" }).success).toBe(true);
    expect(resetPasswordFormSchema.safeParse({ newPassword: "1234567" }).success).toBe(false);
    expect(resetPasswordFormSchema.safeParse({ newPassword: "a".repeat(129) }).success).toBe(false);
  });

  it("phải chọn ít nhất một vai trò", () => {
    expect(rolesFormSchema.safeParse({ roles: [] }).success).toBe(false);
    expect(rolesFormSchema.safeParse({ roles: ["marketing"] }).success).toBe(true);
  });

  it("giữ vai trò ngoài danh sách nhân viên khi lưu", () => {
    const user = { roles: ["customer", "marketing"] };
    expect(staffRolesOf(user)).toEqual(["marketing"]);
    expect(toSetRolesBody(user, ["accountant", "marketing"])).toEqual({
      roles: ["customer", "accountant", "marketing"],
    });
  });
});

describe("canManage", () => {
  it("không cho thao tác trên chính mình hay Super Admin khác", () => {
    expect(canManage({ id: 2, roles: ["marketing"] }, 1)).toBe(true);
    expect(canManage({ id: 1, roles: ["super_admin"] }, 1)).toBe(false);
    expect(canManage({ id: 3, roles: ["super_admin"] }, 1)).toBe(false);
    expect(canManage({ id: 1, roles: ["marketing"] }, 1)).toBe(false);
  });
});
