import { act, render, screen } from "@testing-library/react";
import { clearSession, startSession } from "@slvn/auth";
import { FooterLoginLink } from "./FooterLoginLink";

afterEach(() => clearSession());

describe("FooterLoginLink", () => {
  it("hiện link khi chưa đăng nhập", () => {
    render(<FooterLoginLink />);
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute("href", "/dang-nhap");
  });

  it("ẩn link ngay khi khách đăng nhập", () => {
    render(<FooterLoginLink />);
    act(() =>
      startSession({
        accessToken: "t1",
        expiresIn: 900,
        user: {
          id: 12,
          email: "khach@example.com",
          fullName: "Nguyễn Văn A",
          roles: ["customer"],
          requiresTwoFactorSetup: false,
        },
      }),
    );
    expect(screen.queryByRole("link", { name: "Đăng nhập" })).not.toBeInTheDocument();
  });
});
