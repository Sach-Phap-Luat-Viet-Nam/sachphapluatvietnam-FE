import { render, screen } from "@testing-library/react";
import { clearSession, startSession } from "@slvn/auth";
import { DashboardHome } from "./DashboardHome";

function signIn(roles: string[]) {
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: { id: 3, email: "nv@sachluat.vn", fullName: "Nhân Viên", roles, requiresTwoFactorSetup: false },
  });
}

afterEach(() => clearSession());

describe("DashboardHome", () => {
  it("mỗi phần được giao là một lối tắt bấm được", () => {
    signIn(["order_manager"]);
    render(<DashboardHome />);

    expect(screen.getByRole("link", { name: /Đơn hàng/ })).toHaveAttribute("href", "/don-hang");
    expect(screen.getByRole("link", { name: /Vận chuyển/ })).toHaveAttribute("href", "/van-chuyen");
    expect(screen.queryByRole("link", { name: /Kho/ })).not.toBeInTheDocument();
  });

  it("chỉ hiện số việc chờ của phần người dùng được vào", () => {
    signIn(["order_manager"]);
    render(<DashboardHome workCounts={{ orders: <span>3 đơn chờ xác nhận</span>, inventory: <span>5 SKU</span> }} />);

    expect(screen.getByRole("link", { name: /3 đơn chờ xác nhận/ })).toBeVisible();
    expect(screen.queryByText("5 SKU")).not.toBeInTheDocument();
  });
});
