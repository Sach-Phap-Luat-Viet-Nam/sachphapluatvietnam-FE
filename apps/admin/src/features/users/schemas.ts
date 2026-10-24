import { z } from "zod";
import { STAFF_ROLES } from "@/lib/roles";

// `GET /admin/users` trả `UserResponse` (docs/api_reference.md). `isActive` chỉ có ở backend từ bản thêm vô hiệu hóa
// tài khoản: thiếu thì coi là đang hoạt động để màn không lỗi khi backend chưa cập nhật.

export const staffUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  fullName: z.string(),
  roles: z.array(z.string()),
  twoFactorEnabled: z.boolean(),
  requiresTwoFactorSetup: z.boolean(),
  isActive: z.boolean().default(true),
});
export type StaffUser = z.infer<typeof staffUserSchema>;

export const staffPageSchema = z.object({
  items: z.array(staffUserSchema),
  meta: z.object({ page: z.number(), limit: z.number(), total: z.number() }),
});
export type StaffPage = z.infer<typeof staffPageSchema>;

export const logoutResultSchema = z.object({ revokedSessions: z.number() });

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Mật khẩu tối thiểu ${PASSWORD_MIN} ký tự.`)
  .max(PASSWORD_MAX, `Mật khẩu tối đa ${PASSWORD_MAX} ký tự.`);

const rolesSchema = z.array(z.enum(STAFF_ROLES)).min(1, "Anh/chị chọn ít nhất một vai trò.");

export const createStaffFormSchema = z.object({
  email: z.email("Email chưa đúng định dạng.").max(256, "Tối đa 256 ký tự."),
  fullName: z.string().trim().min(1, "Anh/chị nhập họ tên.").max(255, "Tối đa 255 ký tự."),
  password: passwordSchema,
  roles: rolesSchema,
});
export type CreateStaffFormValues = z.infer<typeof createStaffFormSchema>;

export const resetPasswordFormSchema = z.object({ newPassword: passwordSchema });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

export const rolesFormSchema = z.object({ roles: rolesSchema });
export type RolesFormValues = z.infer<typeof rolesFormSchema>;
