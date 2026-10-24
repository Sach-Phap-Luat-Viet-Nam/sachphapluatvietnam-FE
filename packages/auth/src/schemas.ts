import { z } from "zod";

/** Form đăng nhập email + mật khẩu (`LoginRequest`). */
export const loginSchema = z.object({
  email: z.email("Anh/chị vui lòng nhập email hợp lệ.").max(256, "Email không được quá 256 ký tự."),
  password: z.string().min(1, "Anh/chị vui lòng nhập mật khẩu."),
  rememberMe: z.boolean(),
});
export type LoginValues = z.infer<typeof loginSchema>;

/** Mã 6 số từ ứng dụng xác thực, dùng cho đăng nhập 2FA và bật 2FA. */
export const twoFactorSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Mã xác thực gồm đúng 6 chữ số."),
});
export type TwoFactorValues = z.infer<typeof twoFactorSchema>;
