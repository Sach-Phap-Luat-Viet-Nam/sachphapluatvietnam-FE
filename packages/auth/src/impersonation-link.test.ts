import type * as LinkModule from "./impersonation-link";
import type * as SessionModule from "./session";

const response = {
  accessToken: "imp",
  tokenType: "Bearer",
  expiresIn: 900,
  loginVia: "admin",
  impersonatorId: 1,
  user: {
    id: 42,
    email: "kho@sachluat.vn",
    fullName: "Thủ kho Nguyễn Văn Ấn",
    roles: ["warehouse_keeper"],
    requiresTwoFactorSetup: true,
  },
};

let link: typeof LinkModule;
let session: typeof SessionModule;

beforeEach(async () => {
  vi.resetModules();
  sessionStorage.clear();
  session = await import("./session");
  link = await import("./impersonation-link");
});

describe("impersonationUrl", () => {
  it("đặt phiên vào fragment và đọc lại được, kể cả tên có dấu", () => {
    const url = new URL(link.impersonationUrl("https://admin.example.vn/", response, 5_000));

    expect(url.origin + url.pathname).toBe("https://admin.example.vn/dang-nhap-ho");
    expect(url.search).toBe("");
    expect(link.readImpersonationFragment(url.hash)).toEqual({ response, issuedAt: 5_000 });
  });

  it("fragment sai định dạng thì trả null", () => {
    expect(link.readImpersonationFragment("#session=khong-phai-base64")).toBeNull();
    expect(link.readImpersonationFragment("")).toBeNull();
  });
});

describe("acceptImpersonationFromLocation", () => {
  it("bắt đầu phiên đăng nhập hộ rồi xóa token khỏi URL", () => {
    const url = new URL(link.impersonationUrl(window.location.origin, response));
    window.history.replaceState(null, "", url.pathname + url.hash);

    expect(link.acceptImpersonationFromLocation()).toBe(true);

    expect(window.location.hash).toBe("");
    expect(session.getSessionState()).toMatchObject({ status: "authenticated", user: { id: 42 } });
    expect(session.isImpersonating()).toBe(true);
  });

  it("không có fragment thì không đổi phiên", () => {
    window.history.replaceState(null, "", "/dang-nhap-ho");

    expect(link.acceptImpersonationFromLocation()).toBe(false);
    expect(session.getSessionState().status).toBe("unknown");
  });
});
