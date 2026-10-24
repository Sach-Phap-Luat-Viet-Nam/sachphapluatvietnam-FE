import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { getSessionState } from "@slvn/auth";
import { LoginForm } from "./LoginForm";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const ORIGIN = window.location.origin;
const server = setupServer();

function session(roles: string[], requiresTwoFactorSetup = false) {
  return {
    accessToken: "token-1",
    tokenType: "Bearer",
    expiresIn: 900,
    user: {
      id: 3,
      email: "kho@sachluat.vn",
      fullName: "Trần Thủ Kho",
      phoneNumber: null,
      birthDate: null,
      occupation: null,
      roles,
      twoFactorEnabled: !requiresTwoFactorSetup,
      requiresTwoFactorSetup,
    },
  };
}

function signedIn(roles: string[], requiresTwoFactorSetup = false) {
  return http.post(`${ORIGIN}/api/v1/auth/login`, () =>
    HttpResponse.json({
      requiresTwoFactor: false,
      twoFactorToken: null,
      session: session(roles, requiresTwoFactorSetup),
    }),
  );
}

async function submitCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "kho@sachluat.vn");
  await user.type(screen.getByLabelText("Mật khẩu"), "mat-khau-dung");
  await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  replace.mockReset();
  window.history.replaceState(null, "", "/");
});
afterAll(() => server.close());

describe("LoginForm (admin)", () => {
  it("không gửi rememberMe = true và quay lại trang trong ?next=", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/login`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ requiresTwoFactor: false, twoFactorToken: null, session: session(["super_admin"]) });
      }),
    );
    window.history.replaceState(null, "", "/dang-nhap?next=%2Fkho");
    const user = userEvent.setup();
    render(<LoginForm />);

    expect(screen.queryByLabelText(/Giữ đăng nhập/)).not.toBeInTheDocument();
    await submitCredentials(user);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/kho"));
    expect(body).toEqual({ email: "kho@sachluat.vn", password: "mat-khau-dung", rememberMe: false });
  });

  it("đưa nhân viên chưa bật 2FA sang màn bật 2FA", async () => {
    server.use(signedIn(["warehouse_keeper"], true));
    const user = userEvent.setup();
    render(<LoginForm />);

    await submitCredentials(user);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/xac-thuc-hai-lop"));
  });

  it("từ chối tài khoản khách hàng và đăng xuất ngay", async () => {
    const logout = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(signedIn(["customer"]), http.post(`${ORIGIN}/api/v1/auth/logout`, logout));
    const user = userEvent.setup();
    render(<LoginForm />);

    await submitCredentials(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("không có quyền vào trang quản trị");
    expect(logout).toHaveBeenCalledTimes(1);
    expect(getSessionState()).toEqual({ status: "anonymous" });
    expect(replace).not.toHaveBeenCalled();
  });

  it("hỏi mã 6 số khi tài khoản đã bật 2FA", async () => {
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/login`, () =>
        HttpResponse.json({ requiresTwoFactor: true, twoFactorToken: "2fa-token", session: null }),
      ),
      http.post(`${ORIGIN}/api/v1/auth/login/2fa`, async ({ request }) => {
        const otp = await request.json();
        return otp && typeof otp === "object" && "code" in otp && otp.code === "123456"
          ? HttpResponse.json(session(["order_manager"]))
          : HttpResponse.json({ title: "x", status: 400, code: "OTP_INVALID" }, { status: 400 });
      }),
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await submitCredentials(user);
    const code = await screen.findByLabelText("Mã xác thực");
    await user.type(code, "000000");
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect(await screen.findByText("Mã xác thực không đúng. Anh/chị vui lòng nhập lại.")).toBeVisible();

    await user.clear(code);
    await user.type(code, "123456");
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("quay lại bước mật khẩu khi phiên 2FA hết hạn", async () => {
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/login`, () =>
        HttpResponse.json({ requiresTwoFactor: true, twoFactorToken: "2fa-token", session: null }),
      ),
      http.post(`${ORIGIN}/api/v1/auth/login/2fa`, () =>
        HttpResponse.json({ title: "x", status: 401, code: "TWO_FACTOR_TOKEN_INVALID" }, { status: 401 }),
      ),
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await submitCredentials(user);
    await user.type(await screen.findByLabelText("Mã xác thực"), "123456");
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Phiên xác thực đã hết 5 phút");
    expect(screen.getByLabelText("Email")).toHaveValue("kho@sachluat.vn");
  });
});
