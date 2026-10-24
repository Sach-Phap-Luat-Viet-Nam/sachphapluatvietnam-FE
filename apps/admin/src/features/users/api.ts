import { unwrap } from "@slvn/api-client";
import { browserApi } from "@slvn/auth";
import { logoutResultSchema, staffPageSchema, staffUserSchema } from "./schemas";
import type { StaffPage, StaffUser } from "./schemas";
import type { toCreateStaffBody } from "./user-forms";

// API Admin người dùng (docs/features/auth.md của backend), policy `users_admin`: chỉ `super_admin`, bắt buộc 2FA.
// Các route sau `/roles` chưa có trong OpenAPI đã sinh (khai báo ở packages/api-client/src/pending-paths.ts).

export const STAFF_PAGE_SIZE = 20;

/** Danh sách nhân viên (tài khoản có ít nhất một vai trò nhân viên). */
export async function fetchStaff(page: number): Promise<StaffPage> {
  const data = await unwrap(
    browserApi().GET("/api/v1/admin/users", { params: { query: { Page: page, Limit: STAFF_PAGE_SIZE } } }),
  );
  return staffPageSchema.parse(data);
}

export async function createStaff(body: ReturnType<typeof toCreateStaffBody>): Promise<StaffUser> {
  return staffUserSchema.parse(await unwrap(browserApi().POST("/api/v1/admin/users", { body })));
}

/** Thay toàn bộ vai trò của tài khoản. */
export async function setRoles(id: number, roles: string[]): Promise<StaffUser> {
  const data = await unwrap(
    browserApi().PUT("/api/v1/admin/users/{id}/roles", { params: { path: { id } }, body: { roles } }),
  );
  return staffUserSchema.parse(data);
}

/** Đặt mật khẩu mới: backend mở khóa tài khoản và thu hồi mọi phiên của người đó. */
export async function resetPassword(id: number, newPassword: string): Promise<void> {
  await unwrap(
    browserApi().PUT("/api/v1/admin/users/{id}/password", { params: { path: { id } }, body: { newPassword } }),
  );
}

/** Vô hiệu hóa (`false`) hoặc kích hoạt lại (`true`) tài khoản. */
export async function setActive(id: number, active: boolean): Promise<StaffUser> {
  const path = active ? "/api/v1/admin/users/{id}/activate" : "/api/v1/admin/users/{id}/deactivate";
  return staffUserSchema.parse(await unwrap(browserApi().POST(path, { params: { path: { id } } })));
}

/** Đăng xuất hộ: thu hồi mọi phiên, trả số phiên đã thu hồi. */
export async function logoutEverywhere(id: number): Promise<number> {
  const data = await unwrap(browserApi().POST("/api/v1/admin/users/{id}/logout", { params: { path: { id } } }));
  return logoutResultSchema.parse(data).revokedSessions;
}

export const staffKeys = {
  lists: ["staff"] as const,
  list: (page: number) => ["staff", "list", page] as const,
};
