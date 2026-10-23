import { z } from "zod";
import { unwrap } from "@slvn/api-client";
import { authApi, authResponseSchema, startSession } from "@/lib/auth-session";
import type { LoginValues } from "./schemas";

const loginResponseSchema = z.object({
  requiresTwoFactor: z.boolean(),
  twoFactorToken: z.string().nullable(),
  session: authResponseSchema.nullable(),
});

export type LoginResult = { status: "signed-in" } | { status: "two-factor"; twoFactorToken: string };

/** Đăng nhập bằng email + mật khẩu. Tài khoản đã bật 2FA thì trả `twoFactorToken` để gọi `loginWithTwoFactor`. */
export async function login(values: LoginValues): Promise<LoginResult> {
  const data = loginResponseSchema.parse(await unwrap(authApi().POST("/api/v1/auth/login", { body: values })));
  if (data.requiresTwoFactor && data.twoFactorToken) {
    return { status: "two-factor", twoFactorToken: data.twoFactorToken };
  }
  if (!data.session) {
    throw new Error("Login response has neither session nor twoFactorToken");
  }
  startSession(data.session);
  return { status: "signed-in" };
}

export async function loginWithTwoFactor(twoFactorToken: string, code: string): Promise<void> {
  const data = await unwrap(authApi().POST("/api/v1/auth/login/2fa", { body: { twoFactorToken, code } }));
  startSession(authResponseSchema.parse(data));
}
