import { z } from "zod";
import { createApiClient, isApiError, unwrap } from "@slvn/api-client";
import type { ApiClient } from "@slvn/api-client";

// Phiên đăng nhập phía trình duyệt (docs/api_reference.md, mục Xác thực): access token chỉ nằm trong bộ nhớ,
// refresh token nằm trong cookie HttpOnly `sl_refresh` do backend đặt. Chỉ import từ Client Component.

/** Thông tin người dùng giữ trong phiên (một phần của `UserResponse`). */
export const sessionUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  fullName: z.string(),
  roles: z.array(z.string()),
  /** Nhân viên chưa bật 2FA: phải sang màn bật 2FA, gọi API Admin sẽ bị 403. */
  requiresTwoFactorSetup: z.boolean(),
  /** Giao diện storefront đã chọn; `null` khi chưa chọn (dùng mặc định tối). */
  theme: z.enum(["dark", "light"]).nullish(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

/** `AuthResponse` của backend. Parse bằng Zod vì type sinh từ OpenAPI để số là `number | string`. */
export const authResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
  user: sessionUserSchema,
  /** `admin`: Super Admin đăng nhập hộ (fast login). Response cũ chưa có field này coi là `portal`. */
  loginVia: z.enum(["portal", "admin"]).default("portal"),
  impersonatorId: z.number().nullish(),
  /**
   * Phiên bản phiên của tài khoản lúc cấp token. Sự kiện `session-ended` mang phiên bản mới hơn thì phiên này đã bị
   * kết thúc; bằng hoặc nhỏ hơn là của chính thiết bị này (vừa đăng nhập) nên bỏ qua.
   */
  sessionVersion: z.number().default(0),
});
export type AuthSession = z.input<typeof authResponseSchema>;

/** Phiên đăng nhập hộ: chỉ có access token (không refresh, không cookie), hết hạn ở `expiresAt` (epoch ms). */
export interface Impersonation {
  impersonatorId: number;
  expiresAt: number;
}

/** `expired`: token đăng nhập hộ hết hạn hoặc bị từ chối (401); `exited`: admin bấm Thoát đăng nhập hộ. */
export type ImpersonationEnd = "expired" | "exited";

/** Lý do phiên bị kết thúc từ phía server (`reason` của sự kiện `session-ended`). */
export type SessionEndReason = "signed_in_elsewhere" | "forced_logout";

/**
 * `unknown`: chưa kiểm tra cookie; `anonymous`: chưa đăng nhập (`impersonationEnded` khi tab vừa kết thúc đăng nhập
 * hộ); `authenticated`: đã có access token (`impersonation` khi là phiên đăng nhập hộ).
 */
export type SessionState =
  | { status: "unknown" }
  | { status: "anonymous"; impersonationEnded?: ImpersonationEnd; sessionEnded?: SessionEndReason }
  | { status: "authenticated"; user: SessionUser; sessionVersion: number; impersonation?: Impersonation };

const UNKNOWN: SessionState = { status: "unknown" };
const ANONYMOUS: SessionState = { status: "anonymous" };

/**
 * Cờ "có thể đang đăng nhập" (không phải token). Không có cờ thì bỏ qua `/auth/refresh` khi tải trang, vì `/auth/*`
 * chỉ cho 10 request/phút/IP và khách vãng lai tải lại trang (lọc, tìm kiếm) sẽ làm hết lượt đăng nhập.
 */
const SESSION_HINT_KEY = "slvn:has-session";
/** Refresh token xoay vòng: hai tab refresh cùng lúc bằng một cookie bị backend coi là dùng lại và thu hồi mọi phiên. */
const REFRESH_LOCK = "slvn:auth-refresh";
/**
 * Phiên đăng nhập hộ lưu theo tab (`sessionStorage`) để giữ qua F5. Không dùng `localStorage` vì chia sẻ giữa các
 * tab: tab của chính admin sẽ bị đổi sang danh tính người khác.
 */
const IMPERSONATION_KEY = "slvn:impersonation";

const storedImpersonationSchema = z.object({
  accessToken: z.string(),
  expiresAt: z.number(),
  impersonatorId: z.number(),
  user: sessionUserSchema,
  sessionVersion: z.number().default(0),
});
type StoredImpersonation = z.infer<typeof storedImpersonationSchema>;

let state: SessionState = UNKNOWN;
let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
let impersonationTimer: ReturnType<typeof setTimeout> | null = null;
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

/** Trạng thái phiên hiện tại, dùng với `useSyncExternalStore`. */
export function getSessionState(): SessionState {
  return state;
}

/** Server không biết phiên của khách nên luôn render như chưa kiểm tra. */
export function getServerSessionState(): SessionState {
  return UNKNOWN;
}

function readImpersonation(): StoredImpersonation | null {
  try {
    const raw = sessionStorage.getItem(IMPERSONATION_KEY);
    const parsed = raw === null ? null : storedImpersonationSchema.safeParse(JSON.parse(raw));
    return parsed?.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeImpersonation(value: StoredImpersonation | null): void {
  try {
    if (value) {
      sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(value));
    } else {
      sessionStorage.removeItem(IMPERSONATION_KEY);
    }
  } catch {
    // Trình duyệt chặn storage: phiên đăng nhập hộ chỉ sống tới khi tải lại trang.
  }
}

function activateImpersonation(stored: StoredImpersonation): void {
  accessToken = stored.accessToken;
  if (impersonationTimer) {
    clearTimeout(impersonationTimer);
  }
  impersonationTimer = setTimeout(() => endImpersonation("expired"), Math.max(0, stored.expiresAt - Date.now()));
  setState({
    status: "authenticated",
    user: stored.user,
    sessionVersion: stored.sessionVersion,
    impersonation: { impersonatorId: stored.impersonatorId, expiresAt: stored.expiresAt },
  });
}

/** Tab hiện tại đang là phiên đăng nhập hộ: không được gọi `/auth/refresh` hay `/auth/logout` (cookie là của admin). */
export function isImpersonating(): boolean {
  return state.status === "authenticated" && state.impersonation !== undefined;
}

/**
 * Bắt đầu phiên đăng nhập hộ trong tab này từ `AuthResponse` của `POST /admin/users/{id}/impersonate`. Không ghi
 * cờ "đã đăng nhập" vào `localStorage` để tab khác (của chính admin) không bị ảnh hưởng.
 */
export function startImpersonation(response: unknown, now: number = Date.now()): void {
  const session = authResponseSchema.parse(response);
  if (session.loginVia !== "admin" || session.impersonatorId == null) {
    throw new Error("Not an impersonation session");
  }
  const stored: StoredImpersonation = {
    accessToken: session.accessToken,
    expiresAt: now + session.expiresIn * 1000,
    impersonatorId: session.impersonatorId,
    user: session.user,
    sessionVersion: session.sessionVersion,
  };
  writeImpersonation(stored);
  activateImpersonation(stored);
}

/** Kết thúc phiên đăng nhập hộ: chỉ xóa token ở tab này, không gọi API (token vẫn hợp lệ tới khi hết hạn). */
export function endImpersonation(reason: ImpersonationEnd = "exited"): void {
  if (impersonationTimer) {
    clearTimeout(impersonationTimer);
    impersonationTimer = null;
  }
  writeImpersonation(null);
  accessToken = null;
  setState({ status: "anonymous", impersonationEnded: reason });
}

/** Lưu access token vào bộ nhớ sau khi đăng nhập, bật 2FA hoặc refresh. */
export function startSession(session: AuthSession): void {
  accessToken = session.accessToken;
  writeHint(true);
  setState({
    status: "authenticated",
    user: session.user,
    sessionVersion: authResponseSchema.shape.sessionVersion.parse(session.sessionVersion),
  });
}

/**
 * Server đã kết thúc phiên này (đăng nhập nơi khác hoặc bị buộc đăng xuất): refresh token đã bị xóa nên chỉ cần xóa
 * phiên ở trình duyệt và ghi lý do để UI hiện thông báo. Tab đăng nhập hộ chỉ xóa token của tab, như khi hết hạn.
 */
export function endSession(reason: SessionEndReason): void {
  if (isImpersonating()) {
    endImpersonation("expired");
    return;
  }
  accessToken = null;
  writeHint(false);
  setState({ status: "anonymous", sessionEnded: reason });
}

/** Xóa phiên ở trình duyệt, không gọi backend. Đăng xuất thật dùng `logout`. */
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
  if (isImpersonating()) {
    // Phiên đăng nhập hộ không có refresh token: refresh sẽ trả phiên của chính admin (cookie trên trình duyệt).
    endImpersonation("expired");
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
  if (isImpersonating()) {
    endImpersonation("expired");
    return Promise.resolve(false);
  }
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
  const impersonation = readImpersonation();
  if (impersonation) {
    if (impersonation.expiresAt > Date.now()) {
      activateImpersonation(impersonation);
    } else {
      endImpersonation("expired");
    }
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
  if (isImpersonating()) {
    endImpersonation("exited");
    return;
  }
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
