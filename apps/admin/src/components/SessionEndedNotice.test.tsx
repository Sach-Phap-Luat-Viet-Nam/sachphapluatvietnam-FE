import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { clearSession, endSession, startSession } from "@slvn/auth";
import { SessionEndedNotice } from "./SessionEndedNotice";

function signIn() {
  act(() =>
    startSession({
      accessToken: "t",
      expiresIn: 900,
      sessionVersion: 1,
      user: {
        id: 1,
        email: "nv@sachluat.vn",
        fullName: "Nhân viên",
        roles: ["warehouse_keeper"],
        requiresTwoFactorSetup: false,
      },
    }),
  );
}

afterEach(() => act(() => clearSession()));

describe("SessionEndedNotice", () => {
  it("không hiện khi phiên còn hiệu lực", () => {
    signIn();
    render(<SessionEndedNotice />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("báo bị đăng nhập nơi khác rồi cho đóng", async () => {
    signIn();
    const user = userEvent.setup();
    render(<SessionEndedNotice />);

    act(() => endSession("signed_in_elsewhere"));

    expect(await screen.findByRole("alert")).toHaveTextContent("đăng nhập ở một nơi khác");
    await user.click(screen.getByRole("button", { name: "Đóng thông báo" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("báo bị Super Admin buộc đăng xuất", async () => {
    signIn();
    render(<SessionEndedNotice />);

    act(() => endSession("forced_logout"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Super Admin buộc đăng xuất");
  });
});
