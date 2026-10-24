import type { SessionUser } from "@slvn/auth";
import { gateDecision } from "./session-gate";

function signedIn(overrides: Partial<SessionUser> = {}) {
  const user: SessionUser = {
    id: 1,
    email: "admin@sachluat.vn",
    fullName: "Quản trị",
    roles: ["super_admin"],
    requiresTwoFactorSetup: false,
    ...overrides,
  };
  return { status: "authenticated", user } as const;
}

describe("gateDecision", () => {
  it("chờ trong lúc chưa kiểm tra phiên", () => {
    expect(gateDecision({ status: "unknown" }, "admin")).toEqual({ kind: "checking" });
  });

  it("chuyển về đăng nhập khi chưa có phiên", () => {
    expect(gateDecision({ status: "anonymous" }, "admin")).toEqual({ kind: "login" });
    expect(gateDecision({ status: "anonymous" }, "two-factor-setup")).toEqual({ kind: "login" });
  });

  it("chặn tài khoản khách hàng", () => {
    expect(gateDecision(signedIn({ roles: ["customer"] }), "admin")).toMatchObject({ kind: "forbidden" });
    expect(gateDecision(signedIn({ roles: ["customer"] }), "two-factor-setup")).toMatchObject({ kind: "forbidden" });
  });

  it("đưa nhân viên chưa bật 2FA sang màn bật 2FA", () => {
    expect(gateDecision(signedIn({ requiresTwoFactorSetup: true }), "admin")).toEqual({
      kind: "redirect",
      to: "/xac-thuc-hai-lop",
    });
    expect(gateDecision(signedIn({ requiresTwoFactorSetup: true }), "two-factor-setup")).toMatchObject({
      kind: "allow",
    });
  });

  it("không cho vào lại màn bật 2FA khi đã bật", () => {
    expect(gateDecision(signedIn(), "two-factor-setup")).toEqual({ kind: "redirect", to: "/" });
  });

  it("cho nhân viên đã bật 2FA vào trang quản trị", () => {
    expect(gateDecision(signedIn(), "admin")).toMatchObject({ kind: "allow", user: { id: 1 } });
  });

  it("phiên đăng nhập hộ nhân viên chưa bật 2FA vẫn vào trang quản trị", () => {
    const impersonated = {
      ...signedIn({ roles: ["warehouse_keeper"], requiresTwoFactorSetup: true }),
      impersonation: { impersonatorId: 1, expiresAt: 900_000 },
    };
    expect(gateDecision(impersonated, "admin")).toMatchObject({ kind: "allow" });
    expect(gateDecision(impersonated, "two-factor-setup")).toEqual({ kind: "redirect", to: "/" });
  });

  it("báo phiên đăng nhập hộ đã kết thúc thay vì về trang đăng nhập", () => {
    expect(gateDecision({ status: "anonymous", impersonationEnded: "expired" }, "admin")).toEqual({
      kind: "impersonation-ended",
      reason: "expired",
    });
  });
});
