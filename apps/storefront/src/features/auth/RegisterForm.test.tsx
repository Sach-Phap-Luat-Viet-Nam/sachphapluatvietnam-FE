import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { getSessionState } from "@slvn/auth";
import { RegisterForm } from "./RegisterForm";

const { replace, push } = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push }) }));

const ORIGIN = window.location.origin;
const server = setupServer();

const AUTH_RESPONSE = {
  accessToken: "token-1",
  tokenType: "Bearer",
  expiresIn: 900,
  loginVia: "portal",
  impersonatorId: null,
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

async function fillForm(user: ReturnType<typeof userEvent.setup>, overrides: { confirm?: string } = {}) {
  await user.type(screen.getByLabelText("Họ tên"), "Nguyễn Văn A");
  await user.type(screen.getByLabelText("Email"), "Khach@Example.com");
  await user.type(screen.getByLabelText("Mật khẩu"), "mat-khau-dung");
  await user.type(screen.getByLabelText("Nhập lại mật khẩu"), overrides.confirm ?? "mat-khau-dung");
  await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  replace.mockReset();
  push.mockReset();
  window.history.replaceState(null, "", "/");
});
afterAll(() => server.close());

describe("RegisterForm", () => {
  it("báo lỗi từng ô khi gửi form trống, không gọi API", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    expect(await screen.findByText("Anh/chị vui lòng nhập họ tên.")).toBeVisible();
    expect(screen.getByText("Anh/chị vui lòng nhập email hợp lệ.")).toBeVisible();
    expect(screen.getByText("Mật khẩu tối thiểu 8 ký tự.")).toBeVisible();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("không gửi khi nhập lại mật khẩu không khớp", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillForm(user, { confirm: "mat-khau-khac" });

    expect(await screen.findByText("Mật khẩu nhập lại chưa khớp.")).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });

  it("đăng ký, vào phiên luôn và quay lại trang trong ?next=", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/register`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(AUTH_RESPONSE, { status: 201 });
      }),
    );
    window.history.replaceState(null, "", "/dang-ky?next=%2Fthanh-toan");
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillForm(user);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/thanh-toan"));
    expect(body).toEqual({
      email: "khach@example.com",
      password: "mat-khau-dung",
      fullName: "Nguyễn Văn A",
      phoneNumber: null,
    });
    expect(getSessionState()).toMatchObject({ status: "authenticated", user: { fullName: "Nguyễn Văn A" } });
    expect(screen.getByRole("button", { name: "Đang tạo tài khoản…" })).toBeDisabled();
  });

  it("báo email đã có tài khoản ngay ở ô email", async () => {
    server.use(http.post(`${ORIGIN}/api/v1/auth/register`, () => problem(409, "EMAIL_TAKEN")));
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillForm(user);

    expect(await screen.findByText(/Email này đã có tài khoản/)).toBeVisible();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Tạo tài khoản" })).toBeEnabled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("đưa lỗi validation của backend vào đúng ô", async () => {
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/register`, () =>
        problem(400, "VALIDATION_ERROR", { phoneNumber: ["Số điện thoại không hợp lệ."] }),
      ),
    );
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillForm(user);

    expect(await screen.findByText("Số điện thoại không hợp lệ.")).toBeVisible();
  });

  it("báo lỗi chung khi backend lỗi", async () => {
    server.use(http.post(`${ORIGIN}/api/v1/auth/register`, () => problem(500, "INTERNAL_ERROR")));
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillForm(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Mã tra cứu: 00-trace");
  });

  it("link Đăng nhập giữ ?next=", async () => {
    window.history.replaceState(null, "", "/dang-ky?next=%2Fgio-hang");
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.click(screen.getByRole("link", { name: "Đăng nhập" }));

    expect(push).toHaveBeenCalledWith("/dang-nhap?next=%2Fgio-hang");
  });
});
