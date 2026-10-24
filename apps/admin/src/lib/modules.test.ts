import { modulesForRoles } from "./modules";

const ids = (roles: string[]) => modulesForRoles(roles).map((module) => module.id);

describe("modulesForRoles", () => {
  it("Super Admin thấy mọi phần", () => {
    expect(ids(["super_admin"])).toEqual([
      "overview",
      "catalog",
      "content",
      "inventory",
      "orders",
      "users",
      "customers",
    ]);
  });

  it("theo đúng bảng phân quyền của từng vai trò", () => {
    expect(ids(["product_manager"])).toEqual(["overview", "catalog"]);
    expect(ids(["warehouse_keeper"])).toEqual(["overview", "inventory"]);
    expect(ids(["customer_service"])).toEqual(["overview", "orders"]);
    expect(ids(["accountant"])).toEqual(["overview", "orders"]);
  });

  it("gộp quyền khi có nhiều vai trò", () => {
    expect(ids(["product_manager", "order_manager"])).toEqual(["overview", "catalog", "orders"]);
  });

  it("marketing quản lý nội dung (popup)", () => {
    expect(ids(["marketing"])).toEqual(["overview", "content"]);
  });
});
