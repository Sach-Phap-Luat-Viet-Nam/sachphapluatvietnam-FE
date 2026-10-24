import { unwrap } from "@slvn/api-client";
import { browserApi } from "@slvn/auth";
import { adminUserSchema, customerDetailSchema, logoutResultSchema, userPageSchema } from "./schemas";
import type { AdminUser, CreateStaffValues, CustomerDetail, UserPage } from "./schemas";

// API "Admin — người dùng" (docs/features/auth.md của backend), policy `users_admin`: chỉ Super Admin, bắt buộc 2FA.

export const USERS_PAGE_SIZE = 20;

export interface UserListQuery {
  q: string;
  page: number;
}

function listQuery({ q, page }: UserListQuery) {
  return { Q: q || undefined, Page: page, Limit: USERS_PAGE_SIZE };
}

/** Nhân viên (mọi tài khoản có vai trò nhân viên), xếp theo id. `q` tìm trong email, họ tên, số điện thoại. */
export async function fetchStaff(query: UserListQuery): Promise<UserPage> {
  const data = await unwrap(browserApi().GET("/api/v1/admin/users", { params: { query: listQuery(query) } }));
  return userPageSchema.parse(data);
}

/** Khách hàng (vai trò `customer`), mới đăng ký trước. */
export async function fetchCustomers(query: UserListQuery): Promise<UserPage> {
  const data = await unwrap(browserApi().GET("/api/v1/admin/customers", { params: { query: listQuery(query) } }));
  return userPageSchema.parse(data);
}

export async function fetchCustomer(id: number): Promise<CustomerDetail> {
  const data = await unwrap(browserApi().GET("/api/v1/admin/customers/{id}", { params: { path: { id } } }));
  return customerDetailSchema.parse(data);
}

export async function createStaff(body: CreateStaffValues): Promise<AdminUser> {
  return adminUserSchema.parse(await unwrap(browserApi().POST("/api/v1/admin/users", { body })));
}

export async function setRoles(id: number, roles: string[]): Promise<AdminUser> {
  const data = await unwrap(
    browserApi().PUT("/api/v1/admin/users/{id}/roles", { params: { path: { id } }, body: { roles } }),
  );
  return adminUserSchema.parse(data);
}

/** Khóa không thời hạn và thu hồi mọi phiên của tài khoản. */
export async function lockUser(id: number): Promise<AdminUser> {
  const data = await unwrap(browserApi().POST("/api/v1/admin/users/{id}/lock", { params: { path: { id } } }));
  return adminUserSchema.parse(data);
}

export async function unlockUser(id: number): Promise<AdminUser> {
  const data = await unwrap(browserApi().POST("/api/v1/admin/users/{id}/unlock", { params: { path: { id } } }));
  return adminUserSchema.parse(data);
}

/** Đặt mật khẩu tạm; backend thu hồi mọi phiên của tài khoản. */
export async function resetPassword(id: number, newPassword: string): Promise<void> {
  await unwrap(
    browserApi().POST("/api/v1/admin/users/{id}/password/reset", {
      params: { path: { id } },
      body: { newPassword },
    }),
  );
}

/** Đăng xuất hộ trên mọi thiết bị; trả số phiên vừa thu hồi. */
export async function logoutUser(id: number): Promise<number> {
  const data = await unwrap(browserApi().POST("/api/v1/admin/users/{id}/logout", { params: { path: { id } } }));
  return logoutResultSchema.parse(data).revokedSessions;
}

/** `AuthResponse` của tài khoản đích (`loginVia: "admin"`), chưa parse: tab đăng nhập hộ tự kiểm tra. */
export async function impersonate(id: number): Promise<unknown> {
  return unwrap(browserApi().POST("/api/v1/admin/users/{id}/impersonate", { params: { path: { id } } }));
}

export const userKeys = {
  staff: (query: UserListQuery) => ["users", "staff", query] as const,
  customers: (query: UserListQuery) => ["users", "customers", query] as const,
  customer: (id: number) => ["users", "customer", id] as const,
  all: ["users"] as const,
};
