import { ASSIGNABLE_STAFF_ROLES } from "@/lib/roles";
import type { AssignableStaffRole } from "@/lib/roles";
import type { CreateStaffFormValues, StaffUser } from "./schemas";

/** Body `POST /admin/users`: họ tên bỏ khoảng trắng thừa, email chuẩn hóa chữ thường. */
export function toCreateStaffBody(values: CreateStaffFormValues) {
  return {
    email: values.email.trim().toLowerCase(),
    fullName: values.fullName.trim(),
    password: values.password,
    roles: values.roles,
  };
}

function isAssignableRole(role: string): role is AssignableStaffRole {
  return ASSIGNABLE_STAFF_ROLES.some((staffRole) => staffRole === role);
}

/** Vai trò nhân viên đang có của tài khoản, làm giá trị ban đầu của form đổi vai trò. */
export function staffRolesOf(user: Pick<StaffUser, "roles">): AssignableStaffRole[] {
  return user.roles.filter(isAssignableRole);
}

/**
 * Body `PUT /admin/users/{id}/roles`: danh sách đầy đủ thay vai trò cũ. Giữ nguyên các vai trò màn này không sửa
 * được (ví dụ `customer`, `super_admin`) để không vô tình gỡ.
 */
export function toSetRolesBody(user: Pick<StaffUser, "roles">, staffRoles: readonly AssignableStaffRole[]) {
  return { roles: [...user.roles.filter((role) => !isAssignableRole(role)), ...staffRoles] };
}

/** Chỉ thao tác tài khoản dưới cấp: không phải chính mình, không phải Super Admin (backend trả `CANNOT_MANAGE_USER`). */
export function canManage(user: Pick<StaffUser, "id" | "roles">, currentUserId: number): boolean {
  return user.id !== currentUserId && !user.roles.includes("super_admin");
}
