import { signInDestination } from "./sign-in";

describe("signInDestination", () => {
  it("trả null với tài khoản khách hàng", () => {
    expect(signInDestination({ roles: ["customer"], requiresTwoFactorSetup: false }, "/kho")).toBeNull();
  });

  it("đưa nhân viên chưa bật 2FA sang màn bật 2FA, bỏ qua ?next=", () => {
    expect(signInDestination({ roles: ["warehouse_keeper"], requiresTwoFactorSetup: true }, "/kho")).toBe(
      "/xac-thuc-hai-lop",
    );
  });

  it("quay lại trang trong ?next= nếu là path nội bộ", () => {
    expect(signInDestination({ roles: ["super_admin"], requiresTwoFactorSetup: false }, "/kho?page=2")).toBe(
      "/kho?page=2",
    );
    expect(signInDestination({ roles: ["super_admin"], requiresTwoFactorSetup: false }, "https://evil.com")).toBe("/");
  });
});
