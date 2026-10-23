import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Anh/chị vui lòng nhập email hợp lệ.").max(256, "Email không được quá 256 ký tự."),
  password: z.string().min(1, "Anh/chị vui lòng nhập mật khẩu."),
  rememberMe: z.boolean(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const twoFactorSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Mã xác thực gồm đúng 6 chữ số."),
});
export type TwoFactorValues = z.infer<typeof twoFactorSchema>;
