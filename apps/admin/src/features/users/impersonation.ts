import { impersonationUrl } from "@slvn/auth";
import { impersonate } from "./api";

// Đăng nhập hộ (docs/features/fast-login-super-admin.md): khách hàng mở Storefront, nhân viên mở Admin, mỗi lần một
// tab mới để phiên của chính Super Admin ở tab này giữ nguyên.

/** Gốc URL Storefront (`NEXT_PUBLIC_STOREFRONT_URL`, đọc lúc build). Thiếu thì không đăng nhập hộ khách được. */
export const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || null;

export const POPUP_BLOCKED = "Trình duyệt chặn mở tab mới. Anh/chị cho phép popup với trang quản trị rồi thử lại.";
export const STOREFRONT_MISSING =
  "Chưa cấu hình địa chỉ Storefront (NEXT_PUBLIC_STOREFRONT_URL) nên chưa đăng nhập hộ khách được.";

/** Tài khoản chỉ có vai trò `customer` mở Storefront; còn lại (nhân viên) mở Admin. */
export function impersonationOrigin(
  roles: readonly string[],
  storefrontUrl: string | null,
  adminOrigin: string,
): string | null {
  const customerOnly = roles.length > 0 && roles.every((role) => role === "customer");
  return customerOnly ? storefrontUrl : adminOrigin;
}

/** Thao tác dưới cấp (đăng nhập hộ, khóa, đặt lại mật khẩu): không phải chính mình, không phải Super Admin khác. */
export function canManage(account: { id: number; roles: readonly string[] }, currentUserId: number): boolean {
  return account.id !== currentUserId && !account.roles.includes("super_admin");
}

/**
 * Mở tab đăng nhập hộ. Tab được mở ngay khi bấm (trước khi gọi API) để trình duyệt không coi là popup tự bật, rồi
 * mới chuyển tới trang `/dang-nhap-ho` kèm phiên trong URL fragment.
 */
export async function openImpersonation(account: { id: number; roles: readonly string[] }): Promise<void> {
  const origin = impersonationOrigin(account.roles, STOREFRONT_URL, window.location.origin);
  if (!origin) {
    throw new Error(STOREFRONT_MISSING);
  }
  const tab = window.open("", "_blank");
  if (!tab) {
    throw new Error(POPUP_BLOCKED);
  }
  // Không để tab mới (có thể là domain khác) điều khiển ngược tab quản trị qua `window.opener`.
  tab.opener = null;
  try {
    const response = await impersonate(account.id);
    tab.location.href = impersonationUrl(origin, response);
  } catch (error) {
    tab.close();
    throw error;
  }
}
