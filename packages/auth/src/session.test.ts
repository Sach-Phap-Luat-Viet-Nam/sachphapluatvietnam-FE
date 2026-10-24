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
