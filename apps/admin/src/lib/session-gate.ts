import type { ImpersonationEnd, SessionState, SessionUser } from "@slvn/auth";
import { isStaff } from "./roles";
import { HOME_PATH, TWO_FACTOR_SETUP_PATH } from "./routes";

/**
 * `admin`: các trang quản trị; `two-factor-setup`: màn bật 2FA, cho nhân viên chưa bật (Super Admin bắt buộc, vai trò
 * khác tự chọn).
 */
export type GateRequirement = "admin" | "two-factor-setup";

export type GateDecision =
  | { kind: "checking" }
  | { kind: "login" }
  | { kind: "impersonation-ended"; reason: ImpersonationEnd }
  | { kind: "redirect"; to: string }
  | { kind: "forbidden"; user: SessionUser }
  | { kind: "allow"; user: SessionUser };

/**
 * Quyết định hiển thị gì theo phiên ở trình duyệt. Server không biết phiên (cookie `sl_refresh` chỉ gửi tới
 * `/api/v1/auth`) nên việc chặn nằm ở client; backend vẫn trả 401/403 nếu thiếu quyền.
 */
export function gateDecision(state: SessionState, requirement: GateRequirement): GateDecision {
  if (state.status === "unknown") {
    return { kind: "checking" };
  }
  if (state.status === "anonymous") {
    // Tab đăng nhập hộ vừa kết thúc: không đưa về trang đăng nhập (cookie là của chính admin, sẽ tự vào lại).
    return state.impersonationEnded
      ? { kind: "impersonation-ended", reason: state.impersonationEnded }
      : { kind: "login" };
  }

  const { user } = state;
  // Token đăng nhập hộ đã mang amr=mfa nên nhân viên chưa bật 2FA vẫn dùng được API Admin, không bắt bật 2FA hộ.
  const impersonating = state.impersonation !== undefined;
  if (!isStaff(user.roles)) {
    return { kind: "forbidden", user };
  }
  // Super Admin chưa bật 2FA gọi API Admin sẽ bị 403 nên phải bật 2FA trước.
  if (requirement === "admin" && user.requiresTwoFactorSetup && !impersonating) {
    return { kind: "redirect", to: TWO_FACTOR_SETUP_PATH };
  }
  if (requirement === "two-factor-setup" && (user.twoFactorEnabled === true || impersonating)) {
    return { kind: "redirect", to: HOME_PATH };
  }
  return { kind: "allow", user };
}
