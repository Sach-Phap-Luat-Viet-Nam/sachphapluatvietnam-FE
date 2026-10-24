import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, readImpersonationFragment, startSession } from "@slvn/auth";
import { canManage, impersonationOrigin, openImpersonation, POPUP_BLOCKED } from "./impersonation";

const ORIGIN = window.location.origin;
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() =>
  startSession({
    accessToken: "admin",
    expiresIn: 900,
    user: { id: 1, email: "root@sachluat.vn", fullName: "Root", roles: ["super_admin"], requiresTwoFactorSetup: false },
  }),
);
afterEach(() => {
  server.resetHandlers();
  clearSession();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("impersonationOrigin", () => {
  it("khách hàng mở Storefront, nhân viên mở Admin", () => {
    expect(impersonationOrigin(["customer"], "https://shop.vn", "https://admin.vn")).toBe("https://shop.vn");
    expect(impersonationOrigin(["warehouse_keeper"], "https://shop.vn", "https://admin.vn")).toBe("https://admin.vn");
    expect(impersonationOrigin(["customer", "marketing"], "https://shop.vn", "https://admin.vn")).toBe(
      "https://admin.vn",
    );
  });

  it("chưa cấu hình Storefront thì không mở được tab khách", () => {
    expect(impersonationOrigin(["customer"], null, "https://admin.vn")).toBeNull();
  });
});

describe("canManage", () => {
  it("không thao tác với chính mình hay Super Admin khác", () => {
    expect(canManage({ id: 1, roles: ["warehouse_keeper"] }, 1)).toBe(false);
    expect(canManage({ id: 2, roles: ["super_admin"] }, 1)).toBe(false);
    expect(canManage({ id: 3, roles: ["customer"] }, 1)).toBe(true);
  });
});

describe("openImpersonation", () => {
  it("mở tab trước khi gọi API rồi chuyển tới /dang-nhap-ho kèm phiên trong fragment", async () => {
    const tab = { opener: {}, location: { href: "" }, close: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    const impersonated = { accessToken: "imp", expiresIn: 900, loginVia: "admin", impersonatorId: 1, user: {} };
    server.use(http.post(`${ORIGIN}/api/v1/admin/users/42/impersonate`, () => HttpResponse.json(impersonated)));

    await openImpersonation({ id: 42, roles: ["warehouse_keeper"] });

    expect(open).toHaveBeenCalledWith("", "_blank");
    expect(tab.opener).toBeNull();
    const url = new URL(tab.location.href);
    expect(url.origin + url.pathname).toBe(`${ORIGIN}/dang-nhap-ho`);
    expect(readImpersonationFragment(url.hash)?.response).toEqual(impersonated);
  });

  it("đóng tab khi API lỗi", async () => {
    const tab = { opener: {}, location: { href: "" }, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/users/42/impersonate`, () =>
        HttpResponse.json({ title: "x", status: 422, code: "CANNOT_IMPERSONATE" }, { status: 422 }),
      ),
    );

    await expect(openImpersonation({ id: 42, roles: ["marketing"] })).rejects.toMatchObject({
      code: "CANNOT_IMPERSONATE",
    });
    expect(tab.close).toHaveBeenCalled();
  });

  it("báo khi trình duyệt chặn popup, không gọi API", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    const api = vi.fn(() => HttpResponse.json({}));
    server.use(http.post(`${ORIGIN}/api/v1/admin/users/42/impersonate`, api));

    await expect(openImpersonation({ id: 42, roles: ["marketing"] })).rejects.toThrow(POPUP_BLOCKED);
    expect(api).not.toHaveBeenCalled();
  });
});
