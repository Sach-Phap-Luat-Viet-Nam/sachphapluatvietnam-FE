import { safeNextPath } from "@slvn/auth";
import type { SessionUser } from "@slvn/auth";
import { isStaff } from "@/lib/roles";
import { TWO_FACTOR_SETUP_PATH } from "@/lib/routes";

/**
 * Trang chuyển tới sau khi đăng nhập: màn bật 2FA nếu nhân viên chưa bật, ngược lại về `?next=`.
 * Trả `null` khi tài khoản không có vai trò nhân viên.
 */
export function signInDestination(
  user: Pick<SessionUser, "roles" | "requiresTwoFactorSetup">,
  next: string | null,
): string | null {
  if (!isStaff(user.roles)) {
    return null;
  }
  return user.requiresTwoFactorSetup ? TWO_FACTOR_SETUP_PATH : safeNextPath(next);
}
