import { render, screen } from "@testing-library/react";
import { clearSession, startSession } from "@slvn/auth";
import { ModuleGate } from "./ModuleGate";

function signIn(roles: string[]) {
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: { id: 3, email: "nv@sachluat.vn", fullName: "Nhân Viên", roles, requiresTwoFactorSetup: false },
  });
}

afterEach(() => clearSession());

describe("ModuleGate", () => {
  it("hiện màn hình khi vai trò được vào", () => {
    signIn(["marketing"]);
    render(<ModuleGate module="content">Popup</ModuleGate>);

    expect(screen.getByText("Popup")).toBeVisible();
  });

  it("chặn khi gõ thẳng URL của phần không được giao", () => {
    signIn(["marketing"]);
    render(<ModuleGate module="catalog">Sách</ModuleGate>);

    expect(screen.getByRole("heading", { name: "Không có quyền truy cập" })).toBeVisible();
    expect(screen.getByText(/phần Sách/)).toBeVisible();
    expect(screen.queryByText("Sách", { exact: true })).not.toBeInTheDocument();
  });
});
