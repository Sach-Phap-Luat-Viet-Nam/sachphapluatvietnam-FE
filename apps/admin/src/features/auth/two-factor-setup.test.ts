import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { getSessionState, startSession } from "@slvn/auth";
import { enableTwoFactor, formatSharedKey, setupTwoFactor } from "./two-factor-setup";

const ORIGIN = window.location.origin;
const server = setupServer();

function authResponse(accessToken: string, requiresTwoFactorSetup: boolean) {
  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: 900,
    user: {
      id: 3,
      email: "kho@sachluat.vn",
      fullName: "Trần Thủ Kho",
      roles: ["warehouse_keeper"],
      twoFactorEnabled: !requiresTwoFactorSetup,
      requiresTwoFactorSetup,
    },
  };
}

function problem(status: number, code: string) {
  return HttpResponse.json({ title: code, status, code, traceId: "00-trace" }, { status });
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => startSession(authResponse("before-2fa", true)));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("formatSharedKey", () => {
  it("chia nhóm 4 ký tự", () => {
    expect(formatSharedKey("JBSWY3DPEHPK3PXPAB")).toBe("JBSW Y3DP EHPK 3PXP AB");
    expect(formatSharedKey("")).toBe("");
  });
});

describe("setupTwoFactor", () => {
  it("gửi access token và trả khóa từ backend", async () => {
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/2fa/setup`, ({ request }) =>
        request.headers.get("Authorization") === "Bearer before-2fa"
          ? HttpResponse.json({ sharedKey: "JBSWY3DP", authenticatorUri: "otpauth://totp/x" })
          : problem(401, "UNAUTHORIZED"),
      ),
    );

    await expect(setupTwoFactor()).resolves.toEqual({ sharedKey: "JBSWY3DP", authenticatorUri: "otpauth://totp/x" });
  });

  it("refresh một lần khi access token hết hạn rồi gửi lại", async () => {
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/refresh`, () => HttpResponse.json(authResponse("fresh", true))),
      http.post(`${ORIGIN}/api/v1/auth/2fa/setup`, ({ request }) =>
        request.headers.get("Authorization") === "Bearer fresh"
          ? HttpResponse.json({ sharedKey: "K", authenticatorUri: "otpauth://totp/y" })
          : problem(401, "UNAUTHORIZED"),
      ),
    );

    await expect(setupTwoFactor()).resolves.toMatchObject({ sharedKey: "K" });
  });
});

describe("enableTwoFactor", () => {
  it("thay phiên bằng phiên đã bật 2FA", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/2fa/enable`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(authResponse("after-2fa", false));
      }),
    );

    await enableTwoFactor("123456");

    expect(body).toEqual({ code: "123456" });
    expect(getSessionState()).toMatchObject({ status: "authenticated", user: { requiresTwoFactorSetup: false } });
  });

  it("không refresh khi mã sai", async () => {
    const refresh = vi.fn(() => HttpResponse.json(authResponse("fresh", true)));
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/refresh`, refresh),
      http.post(`${ORIGIN}/api/v1/auth/2fa/enable`, () => problem(400, "OTP_INVALID")),
    );

    await expect(enableTwoFactor("000000")).rejects.toMatchObject({ code: "OTP_INVALID" });
    expect(refresh).not.toHaveBeenCalled();
  });
});
