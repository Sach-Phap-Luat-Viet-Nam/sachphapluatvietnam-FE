import { z } from "zod";
import { createApiClient, isApiError, unwrap } from "@slvn/api-client";
import type { ApiClient } from "@slvn/api-client";

// Phiên đăng nhập phía trình duyệt (docs/api_reference.md, mục Xác thực): access token chỉ nằm trong bộ nhớ,
// refresh token nằm trong cookie HttpOnly `sl_refresh` do backend đặt. Chỉ import từ Client Component.

export const sessionUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  fullName: z.string(),
  roles: z.array(z.string()),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
  user: sessionUserSchema,
});
export type AuthSession = z.infer<typeof authResponseSchema>;

export type SessionState =
  { status: "unknown" } | { status: "anonymous" } | { status: "authenticated"; user: SessionUser };

const UNKNOWN: SessionState = { status: "unknown" };
const ANONYMOUS: SessionState = { status: "anonymous" };

/**
 * Cờ "có thể đang đăng nhập" (không phải token). Không có cờ thì bỏ qua `/auth/refresh` khi tải trang, vì `/auth/*`
 * chỉ cho 10 request/phút/IP và khách vãng lai tải lại trang (lọc, tìm kiếm) sẽ làm hết lượt đăng nhập.
 */
const SESSION_HINT_KEY = "slvn:has-session";
/** Refresh token xoay vòng: hai tab refresh cùng lúc bằng một cookie bị backend coi là dùng lại và thu hồi mọi phiên. */
const REFRESH_LOCK = "slvn:auth-refresh";

let state: SessionState = UNKNOWN;
let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

function setState(next: SessionState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function writeHint(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(SESSION_HINT_KEY, "1");
    } else {
      localStorage.removeItem(SESSION_HINT_KEY);
    }
  } catch {
    // Trình duyệt chặn storage: bỏ qua cờ, chỉ mất tính năng tự khôi phục phiên khi tải lại trang.
  }
}

function readHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

/** Dùng với `useSyncExternalStore`. */
export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSessionState(): SessionState {
  return state;
}

/** Server không biết phiên của khách nên luôn render như chưa kiểm tra. */
export function getServerSessionState(): SessionState {
  return UNKNOWN;
}

export function startSession(session: AuthSession): void {
  accessToken = session.accessToken;
  writeHint(true);
  setState({ status: "authenticated", user: session.user });
}

export function clearSession(): void {
  accessToken = null;
  writeHint(false);
  setState(ANONYMOUS);
}

let publicClient: ApiClient | null = null;
let privateClient: ApiClient | null = null;

/** Client cho `/auth/*`: không gắn Bearer, không tự refresh (401 ở đây là sai mật khẩu, hết phiên 2FA...). */
export function authApi(): ApiClient {
  // Gọi cùng origin để đi qua proxy `/api/v1/*` (backend chưa bật CORS, cookie `sl_refresh` là SameSite=Strict).
  publicClient ??= createApiClient({ baseUrl: window.location.origin });
  return publicClient;
}

/** Client cho API cần đăng nhập: gắn `Authorization: Bearer`, gặp 401 thì refresh một lần rồi gọi lại. */
export function browserApi(): ApiClient {
  privateClient ??= createApiClient({ baseUrl: window.location.origin, fetch: authorizedFetch });
  return privateClient;
}

function withAccessToken(request: Request): Request {
  if (!accessToken) {
    return request;
  }
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return new Request(request, { headers });
}

async function authorizedFetch(request: Request): Promise<Response> {
  // Body chỉ đọc được một lần nên giữ bản sao để gửi lại sau khi refresh.
  const retry = request.clone();
  const response = await globalThis.fetch(withAccessToken(request));
  if (response.status !== 401 || new URL(request.url).pathname.startsWith("/api/v1/auth/")) {
    return response;
  }
  return (await refreshSession()) ? globalThis.fetch(withAccessToken(retry)) : response;
}

function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if ("locks" in navigator) {
    return navigator.locks.request(REFRESH_LOCK, task);
  }
  return task();
}

async function requestRefresh(): Promise<boolean> {
  try {
    const data = await unwrap(authApi().POST("/api/v1/auth/refresh"));
    startSession(authResponseSchema.parse(data));
    return true;
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      clearSession();
      return false;
    }
    throw error;
  }
}

/**
 * Lấy access token mới từ cookie `sl_refresh`. Trả `false` khi không còn phiên (đã chuyển sang `anonymous`).
 * Mọi lời gọi cùng lúc dùng chung một request.
 */
export function refreshSession(): Promise<boolean> {
  refreshing ??= withRefreshLock(requestRefresh).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** Khôi phục phiên khi tải trang. Chỉ gọi backend nếu trình duyệt này từng đăng nhập. */
export function restoreSession(): void {
  if (state.status !== "unknown") {
    return;
  }
  if (!readHint()) {
    setState(ANONYMOUS);
    return;
  }
  // Lỗi mạng hoặc 429/5xx: tạm coi là chưa đăng nhập nhưng giữ cờ để lần tải trang sau thử lại.
  refreshSession().catch(() => setState(ANONYMOUS));
}

/**
 * Đăng xuất phía backend (xóa cookie `sl_refresh`) rồi mới xóa phiên ở trình duyệt. Backend lỗi thì giữ phiên để
 * khách thử lại, tránh hiện "đã đăng xuất" trong khi cookie vẫn còn (máy dùng chung).
 */
export async function logout(): Promise<void> {
  try {
    await unwrap(authApi().POST("/api/v1/auth/logout"));
  } catch (error) {
    // 401: cookie đã hết hạn hoặc bị thu hồi, coi như đã đăng xuất.
    if (!isApiError(error) || error.status !== 401) {
      throw error;
    }
  }
  clearSession();
}
