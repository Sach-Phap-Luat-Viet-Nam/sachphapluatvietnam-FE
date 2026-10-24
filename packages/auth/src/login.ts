import { z } from "zod";
import { unwrap } from "@slvn/api-client";
import { authApi, authResponseSchema, startSession } from "./session";
import type { SessionUser } from "./session";
import type { LoginValues } from "./schemas";

const loginResponseSchema = z.object({
  requiresTwoFactor: z.boolean(),
  twoFactorToken: z.string().nullable(),
  session: authResponseSchema.nullable(),
});

/** Kết quả bước nhập mật khẩu: đã có phiên, hoặc cần nhập tiếp mã 6 số. */
export type LoginResult = { status: "signed-in"; user: SessionUser } | { status: "two-factor"; twoFactorToken: string };

/** App gọi đăng nhập. Backend chỉ cho tài khoản Super Admin đăng nhập ở `admin`. */
export type LoginPortal = "storefront" | "admin";

/** Đăng nhập bằng email + mật khẩu. Tài khoản đã bật 2FA thì trả `twoFactorToken` để gọi `loginWithTwoFactor`. */
export async function login(values: LoginValues, portal: LoginPortal = "storefront"): Promise<LoginResult> {
  const data = loginResponseSchema.parse(
    await unwrap(
      authApi().POST("/api/v1/auth/login", {
        // @ts-expect-error OpenAPI sinh enum `LoginPortal` thành number; backend nhận chuỗi snake_case.
        body: { ...values, portal },
      }),
    ),
  );
  if (data.requiresTwoFactor && data.twoFactorToken) {
    return { status: "two-factor", twoFactorToken: data.twoFactorToken };
  }
  if (!data.session) {
    throw new Error("Login response has neither session nor twoFactorToken");
  }
  startSession(data.session);
  return { status: "signed-in", user: data.session.user };
}

/** Bước nhập mã 6 số, dùng `twoFactorToken` từ `login` (hạn 5 phút). Trả người dùng của phiên mới. */
export async function loginWithTwoFactor(twoFactorToken: string, code: string): Promise<SessionUser> {
  const session = authResponseSchema.parse(
    await unwrap(authApi().POST("/api/v1/auth/login/2fa", { body: { twoFactorToken, code } })),
  );
  startSession(session);
  return session.user;
}
