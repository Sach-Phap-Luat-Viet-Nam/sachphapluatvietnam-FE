import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type * as AuthSessionModule from "./session";

const ORIGIN = window.location.origin;
const HINT_KEY = "slvn:has-session";
const server = setupServer();

function authResponse(accessToken: string) {
  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: 900,
    user: {
      id: 12,
      email: "khach@example.com",
      fullName: "Nguyễn Văn A",
      phoneNumber: null,
      birthDate: null,
      occupation: null,
      roles: ["customer"],
      twoFactorEnabled: false,
      requiresTwoFactorSetup: false,
    },
  };
}

function problem(status: number, code: string) {
  return HttpResponse.json({ title: code, status, code, traceId: "00-trace" }, { status });
}

let session: typeof AuthSessionModule;

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(async () => {
  // Phiên là state cấp module nên nạp lại module cho từng test.
  vi.resetModules();
  localStorage.clear();
  sessionStorage.clear();
  session = await import("./session");
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("restoreSession", () => {
  it("không gọi backend khi trình duyệt chưa từng đăng nhập", () => {
    const refresh = vi.fn(() => HttpResponse.json(authResponse("t1")));
    server.use(http.post(`${ORIGIN}/api/v1/auth/refresh`, refresh));

    session.restoreSession();

    expect(session.getSessionState()).toEqual({ status: "anonymous" });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("khôi phục phiên từ cookie khi có cờ đã đăng nhập", async () => {
    localStorage.setItem(HINT_KEY, "1");
    server.use(http.post(`${ORIGIN}/api/v1/auth/refresh`, () => HttpResponse.json(authResponse("t1"))));

    session.restoreSession();

    await vi.waitFor(() => expect(session.getSessionState().status).toBe("authenticated"));
    expect(session.getSessionState()).toMatchObject({ user: { id: 12, fullName: "Nguyễn Văn A" } });
  });

  it("xóa cờ khi cookie đã hết hạn", async () => {
    localStorage.setItem(HINT_KEY, "1");
    server.use(http.post(`${ORIGIN}/api/v1/auth/refresh`, () => problem(401, "INVALID_REFRESH_TOKEN")));

    session.restoreSession();

    await vi.waitFor(() => expect(session.getSessionState().status).toBe("anonymous"));
    expect(localStorage.getItem(HINT_KEY)).toBeNull();
  });

  it("giữ cờ để thử lại khi backend tạm lỗi", async () => {
    localStorage.setItem(HINT_KEY, "1");
    server.use(http.post(`${ORIGIN}/api/v1/auth/refresh`, () => problem(429, "TOO_MANY_REQUESTS")));

    session.restoreSession();

    await vi.waitFor(() => expect(session.getSessionState().status).toBe("anonymous"));
    expect(localStorage.getItem(HINT_KEY)).toBe("1");
  });
});

describe("refreshSession", () => {
  it("các lời gọi cùng lúc dùng chung một request refresh", async () => {
    const refresh = vi.fn(() => HttpResponse.json(authResponse("t1")));
    server.use(http.post(`${ORIGIN}/api/v1/auth/refresh`, refresh));

    const results = await Promise.all([session.refreshSession(), session.refreshSession(), session.refreshSession()]);

    expect(results).toEqual([true, true, true]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe("browserApi", () => {
  it("gặp 401 thì refresh rồi gửi lại request với token mới", async () => {
    session.startSession(session.authResponseSchema.parse(authResponse("expired")));
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/refresh`, () => HttpResponse.json(authResponse("fresh"))),
      http.post(`${ORIGIN}/api/v1/cart/items`, async ({ request }) => {
        if (request.headers.get("Authorization") !== "Bearer fresh") {
          return problem(401, "UNAUTHORIZED");
        }
        return HttpResponse.json({ received: await request.json() });
      }),
    );

    const { data } = await session.browserApi().POST("/api/v1/cart/items", { body: { skuId: 7, quantity: 2 } });

    expect(data).toEqual({ received: { skuId: 7, quantity: 2 } });
  });

  it("chuyển sang chưa đăng nhập khi refresh cũng 401", async () => {
    session.startSession(session.authResponseSchema.parse(authResponse("expired")));
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/refresh`, () => problem(401, "INVALID_REFRESH_TOKEN")),
      http.get(`${ORIGIN}/api/v1/me`, () => problem(401, "UNAUTHORIZED")),
    );

    const { response } = await session.browserApi().GET("/api/v1/me");

    expect(response.status).toBe(401);
    expect(session.getSessionState()).toEqual({ status: "anonymous" });
  });
});

describe("logout", () => {
  it("xóa phiên và cờ sau khi backend xóa cookie", async () => {
    session.startSession(session.authResponseSchema.parse(authResponse("t1")));
    server.use(http.post(`${ORIGIN}/api/v1/auth/logout`, () => new HttpResponse(null, { status: 204 })));

    await session.logout();

    expect(session.getSessionState()).toEqual({ status: "anonymous" });
    expect(localStorage.getItem(HINT_KEY)).toBeNull();
  });

  it("giữ phiên khi backend lỗi để khách thử lại", async () => {
    session.startSession(session.authResponseSchema.parse(authResponse("t1")));
    server.use(http.post(`${ORIGIN}/api/v1/auth/logout`, () => problem(500, "INTERNAL_ERROR")));

    await expect(session.logout()).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(session.getSessionState().status).toBe("authenticated");
  });
});

describe("đăng nhập hộ", () => {
  const IMPERSONATION_KEY = "slvn:impersonation";

  function impersonationResponse(accessToken: string, expiresIn = 900) {
    return { ...authResponse(accessToken), expiresIn, loginVia: "admin", impersonatorId: 1 };
  }

  afterEach(() => vi.useRealTimers());

  it("lưu phiên theo tab, không ghi cờ đăng nhập dùng chung", () => {
    session.startImpersonation(impersonationResponse("imp"), 1_000);

    expect(session.getSessionState()).toMatchObject({
      status: "authenticated",
      user: { id: 12 },
      impersonation: { impersonatorId: 1, expiresAt: 901_000 },
    });
    expect(session.isImpersonating()).toBe(true);
    expect(sessionStorage.getItem(IMPERSONATION_KEY)).toContain("imp");
    expect(localStorage.getItem(HINT_KEY)).toBeNull();
  });

  it("không nhận response tự đăng nhập", () => {
    expect(() => session.startImpersonation(authResponse("t1"))).toThrow();
    expect(session.getSessionState().status).toBe("unknown");
  });

  it("gặp 401 thì kết thúc phiên, không gọi refresh (cookie là của admin)", async () => {
    const refresh = vi.fn(() => HttpResponse.json(authResponse("admin-own")));
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/refresh`, refresh),
      http.get(`${ORIGIN}/api/v1/me`, ({ request }) =>
        request.headers.get("Authorization") === "Bearer imp" ? problem(401, "UNAUTHORIZED") : HttpResponse.json({}),
      ),
    );
    session.startImpersonation(impersonationResponse("imp"));

    const { response } = await session.browserApi().GET("/api/v1/me");

    expect(response.status).toBe(401);
    expect(refresh).not.toHaveBeenCalled();
    expect(session.getSessionState()).toEqual({ status: "anonymous", impersonationEnded: "expired" });
    expect(sessionStorage.getItem(IMPERSONATION_KEY)).toBeNull();
  });

  it("đăng xuất chỉ thoát đăng nhập hộ, không gọi /auth/logout", async () => {
    localStorage.setItem(HINT_KEY, "1");
    const logout = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.post(`${ORIGIN}/api/v1/auth/logout`, logout));
    session.startImpersonation(impersonationResponse("imp"));

    await session.logout();

    expect(logout).not.toHaveBeenCalled();
    expect(session.getSessionState()).toEqual({ status: "anonymous", impersonationEnded: "exited" });
    expect(localStorage.getItem(HINT_KEY)).toBe("1");
  });

  it("tải lại trang thì khôi phục từ sessionStorage, không refresh", () => {
    const refresh = vi.fn(() => HttpResponse.json(authResponse("admin-own")));
    server.use(http.post(`${ORIGIN}/api/v1/auth/refresh`, refresh));
    localStorage.setItem(HINT_KEY, "1");
    sessionStorage.setItem(
      IMPERSONATION_KEY,
      JSON.stringify({
        accessToken: "imp",
        expiresAt: Date.now() + 60_000,
        impersonatorId: 1,
        user: authResponse("imp").user,
      }),
    );

    session.restoreSession();

    expect(session.isImpersonating()).toBe(true);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("phiên đã quá hạn khi tải lại thì báo hết hạn", () => {
    sessionStorage.setItem(
      IMPERSONATION_KEY,
      JSON.stringify({
        accessToken: "imp",
        expiresAt: Date.now() - 1,
        impersonatorId: 1,
        user: authResponse("x").user,
      }),
    );

    session.restoreSession();

    expect(session.getSessionState()).toEqual({ status: "anonymous", impersonationEnded: "expired" });
  });

  it("tự kết thúc khi hết expiresIn", () => {
    vi.useFakeTimers({ now: 0 });
    session.startImpersonation(impersonationResponse("imp", 900), 0);

    vi.advanceTimersByTime(899_000);
    expect(session.isImpersonating()).toBe(true);
    vi.advanceTimersByTime(1_000);
    expect(session.getSessionState()).toEqual({ status: "anonymous", impersonationEnded: "expired" });
  });
});
