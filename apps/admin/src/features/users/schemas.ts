import { z } from "zod";
import { ASSIGNABLE_STAFF_ROLES } from "@/lib/roles";

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

export const customerUserSchema = staffUserSchema.extend({
  phoneNumber: z.string().nullable(),
  birthDate: z.string().nullable(),
  occupation: z.string().nullable(),
});
export type CustomerUser = z.infer<typeof customerUserSchema>;

export const customerPageSchema = z.object({
  items: z.array(customerUserSchema),
  meta: z.object({ page: z.number(), limit: z.number(), total: z.number() }),
});
export type CustomerPage = z.infer<typeof customerPageSchema>;

const addressSchema = z.object({
  id: z.number(),
  recipientName: z.string(),
  phone: z.string(),
  province: z.string(),
  ward: z.string(),
  streetAddress: z.string(),
  isDefault: z.boolean(),
});

/** `AdminCustomerResponse`: tài khoản, sổ địa chỉ (mặc định đứng đầu), thông tin hóa đơn (null khi chưa lưu). */
export const customerDetailSchema = z.object({
  account: customerUserSchema,
  addresses: z.array(addressSchema),
  invoiceInfo: z
    .object({ companyName: z.string(), taxCode: z.string(), address: z.string(), email: z.string() })
    .nullable(),
});
export type CustomerDetail = z.infer<typeof customerDetailSchema>;

export const logoutResultSchema = z.object({ revokedSessions: z.number() });

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Mật khẩu tối thiểu ${PASSWORD_MIN} ký tự.`)
  .max(PASSWORD_MAX, `Mật khẩu tối đa ${PASSWORD_MAX} ký tự.`);

const rolesSchema = z.array(z.enum(ASSIGNABLE_STAFF_ROLES)).min(1, "Anh/chị chọn ít nhất một vai trò.");

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
