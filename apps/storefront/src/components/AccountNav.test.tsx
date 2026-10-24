import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AccountNav } from "./AccountNav";

const ORIGIN = window.location.origin;
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AccountNav", () => {
  it("restores the session, shows the customer name and logs out", async () => {
    localStorage.setItem("slvn:has-session", "1");
    server.use(
      http.post(`${ORIGIN}/api/v1/auth/refresh`, () =>
        HttpResponse.json({
          accessToken: "token-1",
          tokenType: "Bearer",
          expiresIn: 900,
          user: {
            id: 12,
            email: "khach@example.com",
            fullName: "Nguyễn Văn A",
            roles: ["customer"],
            requiresTwoFactorSetup: false,
          },
        }),
      ),
      http.post(`${ORIGIN}/api/v1/auth/logout`, () => new HttpResponse(null, { status: 204 })),
    );
    const user = userEvent.setup();
    render(<AccountNav />);

    // Trong lúc kiểm tra phiên vẫn hiện link như HTML từ server.
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute("href", "/dang-nhap");
    expect(await screen.findByText("Nguyễn Văn A")).toBeVisible();
    expect(screen.getByRole("link", { name: "Đơn của tôi" })).toHaveAttribute("href", "/don-hang");

    await user.click(screen.getByRole("button", { name: "Đăng xuất" }));

    expect(await screen.findByRole("link", { name: "Đăng nhập" })).toBeVisible();
    expect(localStorage.getItem("slvn:has-session")).toBeNull();
  });
});
