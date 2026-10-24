import { z } from "zod";
import { isApiError, unwrap } from "@slvn/api-client";
import { authResponseSchema, browserApi, refreshSession, startSession } from "@slvn/auth";

const twoFactorSetupSchema = z.object({ sharedKey: z.string(), authenticatorUri: z.string() });
export type TwoFactorSetup = z.infer<typeof twoFactorSetupSchema>;

/**
 * `browserApi` không tự refresh với `/auth/*` (401 ở đó thường là sai mật khẩu). Riêng setup/enable dùng Bearer và
 * sai mã trả 400, nên 401 chỉ là access token hết 15 phút trong lúc nhân viên đang quét QR: refresh rồi gửi lại.
 */
async function withFreshToken<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (isApiError(error) && error.status === 401 && (await refreshSession())) {
      return call();
    }
    throw error;
  }
}

/** Tạo khóa bí mật cho ứng dụng xác thực. Mỗi lần gọi là một khóa mới nên chỉ gọi khi người dùng bấm. */
export async function setupTwoFactor(): Promise<TwoFactorSetup> {
  const data = await withFreshToken(() => unwrap(browserApi().POST("/api/v1/auth/2fa/setup")));
  return twoFactorSetupSchema.parse(data);
}

/** Xác nhận mã 6 số để bật 2FA. Backend thu hồi phiên cũ và trả phiên mới đã qua 2FA. */
export async function enableTwoFactor(code: string): Promise<void> {
  const data = await withFreshToken(() => unwrap(browserApi().POST("/api/v1/auth/2fa/enable", { body: { code } })));
  startSession(authResponseSchema.parse(data));
}

/** Chia khóa thành nhóm 4 ký tự cho dễ nhập tay: `JBSW Y3DP EHPK 3PXP`. */
export function formatSharedKey(key: string): string {
  return (
    key
      .replace(/\s+/g, "")
      .match(/.{1,4}/g)
      ?.join(" ") ?? ""
  );
}
