import { unwrap } from "@slvn/api-client";
import { authApi, authResponseSchema, startSession } from "./session";
import type { SessionUser } from "./session";
import type { RegisterValues } from "./schemas";

/** Body `POST /auth/register`: họ tên, email chuẩn hóa; số điện thoại để trống thì gửi `null`. */
export function toRegisterBody(values: RegisterValues) {
  return {
    email: values.email.trim().toLowerCase(),
    password: values.password,
    fullName: values.fullName.trim(),
    phoneNumber: values.phoneNumber.trim() || null,
  };
}

/**
 * Đăng ký tài khoản khách hàng. Backend trả luôn phiên đăng nhập (cookie `sl_refresh` + access token) nên khách vào
 * thẳng, không phải đăng nhập lại. Email trùng thì ném `ApiError` mã `EMAIL_TAKEN`.
 */
export async function register(values: RegisterValues): Promise<SessionUser> {
  const session = authResponseSchema.parse(
    await unwrap(authApi().POST("/api/v1/auth/register", { body: toRegisterBody(values) })),
  );
  startSession(session);
  return session.user;
}
