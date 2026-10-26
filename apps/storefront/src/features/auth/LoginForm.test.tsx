import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { getSessionState } from "@slvn/auth";
import { LoginForm } from "./LoginForm";

const { replace, push } = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push }) }));

const ORIGIN = window.location.origin;
const server = setupServer();

const AUTH_RESPONSE = {
  accessToken: "token-1",
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

function problem(status: number, code: string, errors?: Record<string, string[]>) {
  return HttpResponse.json({ title: code, status, code, traceId: "00-trace", errors }, { status });
}

async function submitCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "khach@example.com");
  await user.type(screen.getByLabelText("Mật khẩu"), "mat-khau-dung");
  await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  replace.mockReset();
  push.mockReset();
  window.history.replaceState(null, "", "/");
});
afterAll(() => server.close());

describe("LoginForm", () => {
  it("shows field errors without submitting an empty form", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByText("Anh/chị vui lòng nhập email hợp lệ.")).toBeVisible();
    expect(screen.getByText("Anh/chị vui lòng nhập mật khẩu.")).toBeVisible();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const password = screen.getByLabelText("Mật khẩu");
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
    expect(password).toHaveAttribute("type", "text");
  });

  it("signs in and returns to the page in ?next=", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/login`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ requiresTwoFactor: false, twoFactorToken: null, session: AUTH_RESPONSE });
      }),
    );
    window.history.replaceState(null, "", "/dang-nhap?next=%2Fsach%3Fpage%3D2");
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByLabelText("Giữ đăng nhập 30 ngày"));
    await submitCredentials(user);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/sach?page=2"));
    expect(body).toEqual({
      email: "khach@example.com",
      password: "mat-khau-dung",
      rememberMe: true,
      portal: "storefront",
    });
    expect(getSessionState()).toMatchObject({ status: "authenticated", user: { fullName: "Nguyễn Văn A" } });
    expect(screen.getByRole("button", { name: "Đang kiểm tra…" })).toBeDisabled();
  });

  it("shows a form error for wrong credentials and lets the user retry", async () => {
    server.use(http.post(`${ORIGIN}/api/v1/auth/login`, () => problem(401, "INVALID_CREDENTIALS")));
    const user = userEvent.setup();
    render(<LoginForm />);

    await submitCredentials(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Email hoặc mật khẩu không đúng.");
    expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeEnabled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("maps backend validation errors to fields", async () => {
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/login`, () =>
        problem(400, "VALIDATION_ERROR", { email: ["Email không tồn tại trong hệ thống."] }),
      ),
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await submitCredentials(user);

    expect(await screen.findByText("Email không tồn tại trong hệ thống.")).toBeVisible();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("asks for the 6-digit code when the account has 2FA", async () => {
    let otpBody: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/login`, () =>
        HttpResponse.json({ requiresTwoFactor: true, twoFactorToken: "2fa-token", session: null }),
      ),
      http.post(`${ORIGIN}/api/v1/auth/login/2fa`, async ({ request }) => {
        otpBody = await request.json();
        return otpBody && typeof otpBody === "object" && "code" in otpBody && otpBody.code === "123456"
          ? HttpResponse.json(AUTH_RESPONSE)
          : problem(400, "OTP_INVALID");
      }),
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await submitCredentials(user);
    const code = await screen.findByLabelText("Mã xác thực");
    expect(code).toHaveFocus();

    await user.type(code, "000000");
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect(await screen.findByText("Mã xác thực không đúng. Anh/chị vui lòng nhập lại.")).toBeVisible();

    await user.clear(code);
    await user.type(code, "123456");
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(otpBody).toEqual({ twoFactorToken: "2fa-token", code: "123456", trustDevice: false });
  });

  it("returns to the password step when the 2FA token expired", async () => {
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/login`, () =>
        HttpResponse.json({ requiresTwoFactor: true, twoFactorToken: "2fa-token", session: null }),
      ),
      http.post(`${ORIGIN}/api/v1/auth/login/2fa`, () => problem(401, "TWO_FACTOR_TOKEN_INVALID")),
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await submitCredentials(user);
    await user.type(await screen.findByLabelText("Mã xác thực"), "123456");
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Phiên xác thực đã hết 5 phút");
    expect(screen.getByLabelText("Email")).toHaveValue("khach@example.com");
  });

  it("offers buying without an account", () => {
    render(<LoginForm />);
    expect(screen.getByRole("link", { name: "Tiếp tục mua sách không cần đăng nhập" })).toHaveAttribute(
      "href",
      "/sach",
    );
  });

  it("link Đăng ký giữ ?next=", async () => {
    window.history.replaceState(null, "", "/dang-nhap?next=%2Fgio-hang");
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("link", { name: "Đăng ký" }));

    expect(push).toHaveBeenCalledWith("/dang-ky?next=%2Fgio-hang");
  });
});
