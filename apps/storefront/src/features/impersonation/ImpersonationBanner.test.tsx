import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { clearSession, startImpersonation, startSession } from "@slvn/auth";
import { ImpersonationBanner } from "./ImpersonationBanner";

const user = {
  id: 42,
  email: "khach@example.com",
  fullName: "Nguyễn Văn A",
  roles: ["customer"],
  requiresTwoFactorSetup: false,
};

afterEach(() => {
  act(() => clearSession());
  sessionStorage.clear();
});

describe("ImpersonationBanner", () => {
  it("không hiện với phiên tự đăng nhập", () => {
    act(() => startSession({ accessToken: "t1", expiresIn: 900, user }));
    render(<ImpersonationBanner />);

    expect(screen.queryByRole("region", { name: "Đang đăng nhập hộ" })).toBeNull();
  });

  it("hiện tài khoản, thời gian còn lại và thoát được", async () => {
    act(() =>
      startImpersonation(
        { accessToken: "imp", expiresIn: 900, loginVia: "admin", impersonatorId: 1, user },
        Date.now(),
      ),
    );
    render(<ImpersonationBanner />);

    const banner = screen.getByRole("region", { name: "Đang đăng nhập hộ" });
    expect(banner).toHaveTextContent("khach@example.com");
    expect(banner).toHaveTextContent(/1[45]:\d\d/);

    await userEvent.setup().click(screen.getByRole("button", { name: "Thoát đăng nhập hộ" }));

    expect(screen.getByRole("status")).toHaveTextContent("Đã thoát đăng nhập hộ. Bạn có thể đóng tab này.");
  });
});
