import { z } from "zod";
import { startImpersonation } from "./session";

// Chuyển phiên đăng nhập hộ từ tab Admin sang tab mới (docs/features/fast-login-super-admin.md): token nằm trong URL
// fragment nên không gửi lên server, không lọt vào log hay header `Referer`. Trang nhận đọc xong thì xóa fragment.

/** Trang nhận phiên đăng nhập hộ, có ở cả Storefront và Admin. */
export const IMPERSONATION_PATH = "/dang-nhap-ho";

const FRAGMENT_KEY = "session";

const payloadSchema = z.object({
  /** `AuthResponse` của `POST /admin/users/{id}/impersonate`. */
  response: z.unknown(),
  /** Thời điểm nhận response (epoch ms), để đếm ngược đúng `expiresIn` dù tab mới mở chậm. */
  issuedAt: z.number(),
});

function toBase64Url(text: string): string {
  let binary = "";
  new TextEncoder().encode(text).forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

/** URL mở tab đăng nhập hộ ở app đích (`appOrigin` không có dấu `/` cuối, ví dụ origin của Storefront). */
export function impersonationUrl(appOrigin: string, response: unknown, issuedAt: number = Date.now()): string {
  const payload = toBase64Url(JSON.stringify({ response, issuedAt }));
  return `${appOrigin.replace(/\/+$/, "")}${IMPERSONATION_PATH}#${FRAGMENT_KEY}=${payload}`;
}

/** Đọc phiên đăng nhập hộ từ fragment (`location.hash`); sai định dạng thì trả `null`. */
export function readImpersonationFragment(hash: string): z.infer<typeof payloadSchema> | null {
  const value = new URLSearchParams(hash.replace(/^#/, "")).get(FRAGMENT_KEY);
  if (!value) {
    return null;
  }
  try {
    const parsed = payloadSchema.safeParse(JSON.parse(fromBase64Url(value)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Trang `/dang-nhap-ho` gọi khi tải: đọc phiên từ fragment, xóa fragment khỏi URL rồi bắt đầu phiên đăng nhập hộ.
 * Trả `false` khi không có hoặc sai dữ liệu.
 */
export function acceptImpersonationFromLocation(): boolean {
  const payload = readImpersonationFragment(window.location.hash);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  if (!payload) {
    return false;
  }
  try {
    startImpersonation(payload.response, payload.issuedAt);
    return true;
  } catch {
    return false;
  }
}
