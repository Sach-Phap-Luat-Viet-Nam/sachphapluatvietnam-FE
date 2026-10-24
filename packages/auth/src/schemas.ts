import { z } from "zod";

/** Form đăng nhập email + mật khẩu (`LoginRequest`). */
export const loginSchema = z.object({
  email: z.email("Anh/chị vui lòng nhập email hợp lệ.").max(256, "Email không được quá 256 ký tự."),
  password: z.string().min(1, "Anh/chị vui lòng nhập mật khẩu."),
  rememberMe: z.boolean(),
});
export type LoginValues = z.infer<typeof loginSchema>;

/** Số di động Việt Nam `0xxxxxxxxx` hoặc `+84xxxxxxxxx`, cùng quy tắc với backend (`AuthRules.PhonePattern`). */
const PHONE_PATTERN = /^(0|\+84)[0-9]{9}$/;

/** Mật khẩu 8–128 ký tự, cùng quy tắc với backend. */
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

/** Form đăng ký khách hàng (`RegisterRequest`). `confirmPassword` chỉ để kiểm tra gõ nhầm, không gửi lên backend. */
export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, "Anh/chị vui lòng nhập họ tên.").max(255, "Họ tên không được quá 255 ký tự."),
    email: z.email("Anh/chị vui lòng nhập email hợp lệ.").max(256, "Email không được quá 256 ký tự."),
    // Không bắt buộc: để trống thì không gửi.
    phoneNumber: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || PHONE_PATTERN.test(value),
        "Số điện thoại gồm 10 số, bắt đầu bằng 0 hoặc +84.",
      ),
    password: z
      .string()
      .min(PASSWORD_MIN, `Mật khẩu tối thiểu ${PASSWORD_MIN} ký tự.`)
      .max(PASSWORD_MAX, `Mật khẩu tối đa ${PASSWORD_MAX} ký tự.`),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu nhập lại chưa khớp.",
  });
export type RegisterValues = z.infer<typeof registerSchema>;

/** Mã 6 số từ ứng dụng xác thực, dùng cho đăng nhập 2FA và bật 2FA. */
export const twoFactorSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Mã xác thực gồm đúng 6 chữ số."),
});
export type TwoFactorValues = z.infer<typeof twoFactorSchema>;
