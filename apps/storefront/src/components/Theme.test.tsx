import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, endSession, startSession } from "@slvn/auth";
import { SessionEndedNotice } from "./SessionEndedNotice";
import { ThemeSync } from "./ThemeSync";
import { ThemeToggle } from "./ThemeToggle";

const ORIGIN = window.location.origin;
const server = setupServer();

function signIn(theme: "dark" | "light" | null, sessionVersion = 1) {
  act(() =>
    startSession({
      accessToken: "token-1",
      expiresIn: 900,
      sessionVersion,
      user: {
        id: 12,
        email: "khach@example.com",
        fullName: "Nguyễn Văn A",
        roles: ["customer"],
        requiresTwoFactorSetup: false,
        theme,
      },
    }),
  );
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});
afterEach(() => {
  server.resetHandlers();
  act(() => clearSession());
});
afterAll(() => server.close());

describe("ThemeToggle", () => {
  it("đổi giao diện, nhớ ở trình duyệt và lưu vào tài khoản khi đã đăng nhập", async () => {
    const saved = vi.fn();
    server.use(
      http.put(`${ORIGIN}/api/v1/me/preferences`, async ({ request }) => {
        saved(await request.json());
        return HttpResponse.json({ theme: "light" });
      }),
    );
    signIn(null);
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "Chuyển sang giao diện sáng" }));

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("slvn:theme")).toBe("light");
    await waitFor(() => expect(saved).toHaveBeenCalledWith({ theme: "light" }));
    expect(screen.getByRole("button", { name: "Chuyển sang giao diện tối" })).toBeVisible();
  });

  it("khách vãng lai đổi giao diện mà không gọi API", async () => {
    act(() => clearSession());
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "Chuyển sang giao diện sáng" }));

    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

describe("ThemeSync", () => {
  it("áp dụng giao diện đã lưu trong tài khoản", () => {
    render(<ThemeSync />);

    signIn("light");

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("slvn:theme")).toBe("light");
  });

  it("tài khoản chưa chọn mà trình duyệt đã chọn thì lưu lên tài khoản", async () => {
    const saved = vi.fn();
    server.use(
      http.put(`${ORIGIN}/api/v1/me/preferences`, async ({ request }) => {
        saved(await request.json());
        return HttpResponse.json({ theme: "light" });
      }),
    );
    localStorage.setItem("slvn:theme", "light");
    render(<ThemeSync />);

    signIn(null);

    await waitFor(() => expect(saved).toHaveBeenCalledWith({ theme: "light" }));
  });
});

describe("SessionEndedNotice", () => {
  it("báo lý do bị đăng xuất và cho đăng nhập lại", async () => {
    signIn("dark");
    const user = userEvent.setup();
    render(<SessionEndedNotice />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    act(() => endSession("signed_in_elsewhere"));

    expect(await screen.findByRole("alert")).toHaveTextContent("đăng nhập ở một nơi khác");
    expect(screen.getByRole("link", { name: "Đăng nhập lại" })).toHaveAttribute("href", "/dang-nhap");
    await user.click(screen.getByRole("button", { name: "Đóng thông báo" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("báo khi bị quản trị viên buộc đăng xuất", async () => {
    signIn("dark");
    render(<SessionEndedNotice />);

    act(() => endSession("forced_logout"));

    expect(await screen.findByRole("alert")).toHaveTextContent("quản trị viên");
  });
});
