import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { StaffList } from "./StaffList";

const ORIGIN = window.location.origin;
const server = setupServer();

function staff(id: number, email: string, roles: string[], extra: Record<string, unknown> = {}) {
  return {
    id,
    email,
    fullName: `Nhân viên ${id}`,
    phoneNumber: null,
    roles,
    twoFactorEnabled: true,
    requiresTwoFactorSetup: false,
    isLocked: false,
    lockedUntil: null,
    createdAt: "2026-10-24T05:30:00Z",
    ...extra,
  };
}

let items = [staff(1, "root@sachluat.vn", ["super_admin"]), staff(5, "kho@sachluat.vn", ["warehouse_keeper"])];
let lastQuery: URLSearchParams | null = null;

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <StaffList />
    </QueryClientProvider>,
  );
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  items = [staff(1, "root@sachluat.vn", ["super_admin"]), staff(5, "kho@sachluat.vn", ["warehouse_keeper"])];
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: { id: 1, email: "root@sachluat.vn", fullName: "Root", roles: ["super_admin"], requiresTwoFactorSetup: false },
  });
  server.use(
    http.get(`${ORIGIN}/api/v1/admin/users`, ({ request }) => {
      lastQuery = new URL(request.url).searchParams;
      return HttpResponse.json({ items, meta: { page: 1, limit: 20, total: items.length } });
    }),
  );
});
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

describe("StaffList", () => {
  it("tìm theo từ khóa", async () => {
    const user = userEvent.setup();
    renderList();

    await screen.findByText("kho@sachluat.vn");
    await user.type(screen.getByLabelText("Email, họ tên hoặc số điện thoại"), " kho ");
    await user.click(screen.getByRole("button", { name: "Tìm" }));

    await vi.waitFor(() => expect(lastQuery?.get("Q")).toBe("kho"));
  });

  it("thêm nhân viên với vai trò đã chọn", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/users`, async ({ request }) => {
        body = await request.json();
        const created = staff(9, "mkt@sachluat.vn", ["marketing"], { twoFactorEnabled: false });
        items = [...items, created];
        return HttpResponse.json(created, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderList();

    await user.click(await screen.findByRole("button", { name: "Thêm nhân viên" }));
    const form = screen.getByRole("form", { name: "Thêm nhân viên" });
    await user.type(within(form).getByLabelText("Email"), "mkt@sachluat.vn");
    await user.type(within(form).getByLabelText("Họ tên"), "Marketing");
    await user.type(within(form).getByLabelText("Mật khẩu tạm"), "mat-khau-tam-1");
    await user.click(within(form).getByRole("button", { name: "Thêm nhân viên" }));
    expect(await within(form).findByText("Chọn ít nhất một vai trò.")).toBeVisible();

    await user.click(within(form).getByLabelText("Marketing"));
    await user.click(within(form).getByRole("button", { name: "Thêm nhân viên" }));

    expect(await screen.findByText("mkt@sachluat.vn")).toBeVisible();
    expect(body).toEqual({
      email: "mkt@sachluat.vn",
      fullName: "Marketing",
      password: "mat-khau-tam-1",
      roles: ["marketing"],
    });
  });

  it("không có nút đăng nhập hộ/khóa với chính mình, có với nhân viên dưới cấp", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(await screen.findByRole("button", { name: "Quản lý root@sachluat.vn" }));
    expect(screen.queryByRole("button", { name: "Đăng nhập hộ" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Khóa" })).toBeNull();
    expect(screen.getByRole("button", { name: "Đăng xuất hộ" })).toBeVisible();
    expect(screen.getByLabelText("Super Admin")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Quản lý root@sachluat.vn" }));
    await user.click(screen.getByRole("button", { name: "Quản lý kho@sachluat.vn" }));
    expect(screen.getByRole("button", { name: "Đăng nhập hộ" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Khóa" })).toBeVisible();
  });

  it("lưu vai trò mới", async () => {
    let body: unknown;
    server.use(
      http.put(`${ORIGIN}/api/v1/admin/users/5/roles`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(staff(5, "kho@sachluat.vn", ["warehouse_keeper", "accountant"]));
      }),
    );
    const user = userEvent.setup();
    renderList();

    await user.click(await screen.findByRole("button", { name: "Quản lý kho@sachluat.vn" }));
    await user.click(screen.getByLabelText("Kế toán"));
    await user.click(screen.getByRole("button", { name: "Lưu vai trò" }));

    await vi.waitFor(() => expect(body).toEqual({ roles: ["warehouse_keeper", "accountant"] }));
  });
});
