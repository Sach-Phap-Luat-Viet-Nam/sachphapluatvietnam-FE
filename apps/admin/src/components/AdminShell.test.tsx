import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { AdminShell } from "./AdminShell";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/" }));

const ORIGIN = window.location.origin;
const server = setupServer();

function signIn(roles: string[], requiresTwoFactorSetup = false, twoFactorEnabled = !requiresTwoFactorSetup) {
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: {
      id: 3,
      email: "nv@sachluat.vn",
      fullName: "Lê Nhân Viên",
      roles,
      requiresTwoFactorSetup,
      twoFactorEnabled,
    },
  });
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  replace.mockReset();
  clearSession();
});
afterAll(() => server.close());

describe("AdminShell", () => {
  it("chuyển về đăng nhập khi chưa có phiên", async () => {
    render(<AdminShell>Nội dung</AdminShell>);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/dang-nhap"));
    expect(screen.queryByText("Nội dung")).not.toBeInTheDocument();
  });

  it("hiện menu theo vai trò", () => {
    signIn(["warehouse_keeper"]);
    render(<AdminShell>Nội dung</AdminShell>);

    const nav = screen.getByRole("navigation", { name: "Quản trị" });
    expect(nav).toHaveTextContent("Tổng quan");
    expect(nav).not.toHaveTextContent("Nhân viên");
    expect(nav).not.toHaveTextContent("Đơn hàng");
    expect(screen.getByRole("link", { name: "Tổng quan" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Kho" })).toHaveAttribute("href", "/kho");
    expect(screen.getByText("Thủ kho")).toBeVisible();
    expect(screen.getByText("Nội dung")).toBeVisible();
  });

  it("nhân viên thường chưa bật 2FA vẫn vào được và thấy gợi ý bật 2FA", () => {
    signIn(["warehouse_keeper"], false, false);
    render(<AdminShell>Nội dung</AdminShell>);

    expect(screen.getByText("Nội dung")).toBeVisible();
    expect(screen.getByRole("link", { name: "Bật xác thực 2 lớp" })).toHaveAttribute("href", "/xac-thuc-hai-lop");
  });

  it("không gợi ý bật 2FA khi đã bật", () => {
    signIn(["warehouse_keeper"]);
    render(<AdminShell>Nội dung</AdminShell>);

    expect(screen.queryByRole("link", { name: "Bật xác thực 2 lớp" })).not.toBeInTheDocument();
  });

  it("đưa Super Admin chưa bật 2FA sang màn bật 2FA", async () => {
    signIn(["super_admin"], true);
    render(<AdminShell>Nội dung</AdminShell>);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/xac-thuc-hai-lop"));
    expect(screen.queryByText("Nội dung")).not.toBeInTheDocument();
  });

  it("chặn tài khoản khách hàng và cho đăng xuất", async () => {
    server.use(http.post(`${ORIGIN}/api/v1/auth/logout`, () => new HttpResponse(null, { status: 204 })));
    signIn(["customer"]);
    const user = userEvent.setup();
    render(<AdminShell>Nội dung</AdminShell>);

    expect(screen.getByRole("heading", { name: "Không có quyền truy cập" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Đăng xuất" }));

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/dang-nhap"));
  });

  it("mở và đóng menu trên mobile", async () => {
    signIn(["super_admin"]);
    const user = userEvent.setup();
    render(<AdminShell>Nội dung</AdminShell>);

    const toggle = screen.getByRole("button", { name: "Mở menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Đóng menu" })).toHaveAttribute("aria-expanded", "true");
  });
});
