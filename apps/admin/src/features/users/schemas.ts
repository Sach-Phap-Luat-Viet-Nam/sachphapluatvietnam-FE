import { z } from "zod";

// Schema theo `AdminUserResponse`, `AdminCustomerResponse` (docs/features/auth.md của backend). Parse bằng Zod vì
// type sinh từ OpenAPI để số là `number | string`.

export const adminUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  fullName: z.string(),
  phoneNumber: z.string().nullable(),
  roles: z.array(z.string()),
  twoFactorEnabled: z.boolean(),
  requiresTwoFactorSetup: z.boolean(),
  /** Bị Super Admin khóa (`lockedUntil = null`) hoặc tạm khóa 15 phút do đăng nhập sai nhiều lần. */
  isLocked: z.boolean(),
  lockedUntil: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const userPageSchema = z.object({
  items: z.array(adminUserSchema),
  meta: z.object({ page: z.number(), limit: z.number(), total: z.number() }),
});
export type UserPage = z.infer<typeof userPageSchema>;

const addressSchema = z.object({
  id: z.number(),
  recipientName: z.string(),
  phone: z.string(),
  province: z.string(),
  ward: z.string(),
  streetAddress: z.string(),
  isDefault: z.boolean(),
});
export type CustomerAddress = z.infer<typeof addressSchema>;

export const customerDetailSchema = z.object({
  account: adminUserSchema,
  birthDate: z.string().nullable(),
  occupation: z.string().nullable(),
  addresses: z.array(addressSchema),
  invoiceInfo: z
    .object({ companyName: z.string(), taxCode: z.string(), address: z.string(), email: z.string() })
    .nullable(),
});
export type CustomerDetail = z.infer<typeof customerDetailSchema>;

export const logoutResultSchema = z.object({ revokedSessions: z.number() });

/** Mật khẩu theo quy tắc backend: 8–128 ký tự. */
const passwordSchema = z.string().min(8, "Mật khẩu tối thiểu 8 ký tự.").max(128, "Mật khẩu tối đa 128 ký tự.");

export const resetPasswordSchema = z.object({ newPassword: passwordSchema });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const createStaffSchema = z.object({
  email: z.email("Email không hợp lệ.").max(256),
  fullName: z.string().trim().min(1, "Nhập họ tên.").max(255),
  password: passwordSchema,
  roles: z.array(z.string()).min(1, "Chọn ít nhất một vai trò."),
});
export type CreateStaffValues = z.infer<typeof createStaffSchema>;
