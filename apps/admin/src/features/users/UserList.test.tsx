import type { ReactElement } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import type { StaffUser } from "./schemas";
import { UserList } from "./UserList";

const ORIGIN = window.location.origin;
const server = setupServer();

const ADMIN: StaffUser = {
  id: 1,
  email: "admin@sachluat.vn",
  fullName: "Quản trị viên",
  roles: ["super_admin"],
  twoFactorEnabled: true,
  requiresTwoFactorSetup: false,
  isActive: true,
};
const KEEPER: StaffUser = {
  id: 2,
  email: "kho@sachluat.vn",
  fullName: "Thủ kho",
  roles: ["warehouse_keeper"],
  twoFactorEnabled: false,
  requiresTwoFactorSetup: true,
  isActive: true,
};

function page(items: StaffUser[]) {
  return { items, meta: { page: 1, limit: 20, total: items.length } };
}

function renderList(ui: ReactElement = <UserList />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** Danh sách có trạng thái: các API ghi cập nhật `users` để lần tải lại sau đó thấy thay đổi. */
function useUsers(initial: StaffUser[]) {
  let users = initial.map((user) => ({ ...user }));
  server.use(http.get(`${ORIGIN}/api/v1/admin/users`, () => HttpResponse.json(page(users))));
  return {
    update(id: number, change: Partial<StaffUser>) {
      users = users.map((user) => (user.id === id ? { ...user, ...change } : user));
    },
    find: (id: number) => users.find((user) => user.id === id),
  };
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() =>
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: {
      id: 1,
      email: ADMIN.email,
      fullName: ADMIN.fullName,
      roles: ["super_admin"],
      requiresTwoFactorSetup: false,
    },
  }),
);
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

async function rowOf(name: string) {
  const row = (await screen.findByText(name)).closest("li");
  if (!row) throw new Error(`Không thấy dòng ${name}`);
  return row;
}

describe("UserList", () => {
  it("hiện nhân viên, ẩn thao tác không được phép trên chính mình và Super Admin", async () => {
    useUsers([ADMIN, KEEPER]);
    renderList();

    const self = await rowOf("Quản trị viên");
    expect(within(self).getByText("Bạn")).toBeVisible();
    expect(within(self).getByRole("button", { name: /Đổi vai trò/ })).toBeVisible();
    expect(within(self).queryByRole("button", { name: /Đặt mật khẩu/ })).not.toBeInTheDocument();
    expect(within(self).queryByRole("button", { name: "Vô hiệu hóa" })).not.toBeInTheDocument();
    expect(within(self).queryByRole("button", { name: "Đăng xuất hộ" })).not.toBeInTheDocument();

    const keeper = await rowOf("Thủ kho");
    expect(within(keeper).getByText("Chưa bật 2FA")).toBeVisible();
    expect(within(keeper).getByRole("button", { name: /Đặt mật khẩu mới/ })).toBeVisible();
    expect(within(keeper).getByRole("button", { name: "Vô hiệu hóa" })).toBeVisible();
  });

  it("thêm nhân viên và báo lỗi email trùng ngay tại ô email", async () => {
    const users = useUsers([ADMIN]);
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/users`, async ({ request }) => {
        body = await request.json();
        const email = (body as { email: string }).email;
        if (email === "trung@sachluat.vn") {
          return HttpResponse.json(
            { title: "Email đã được đăng ký", status: 409, code: "EMAIL_TAKEN" },
            { status: 409 },
          );
        }
        users.update(1, {});
        return HttpResponse.json(KEEPER, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderList();

    await user.click(await screen.findByRole("button", { name: "Thêm nhân viên" }));
    const form = screen.getByRole("form", { name: "Thêm nhân viên" });
    await user.click(within(form).getByRole("button", { name: "Thêm nhân viên" }));
    expect(await within(form).findByText("Anh/chị chọn ít nhất một vai trò.")).toBeVisible();

    await user.type(within(form).getByLabelText("Email đăng nhập"), "Trung@SachLuat.vn");
    await user.type(within(form).getByLabelText("Họ và tên"), "Người trùng");
    await user.type(within(form).getByLabelText("Mật khẩu tạm"), "mat-khau-tam");
    await user.click(within(form).getByRole("checkbox", { name: "Thủ kho" }));
    await user.click(within(form).getByRole("button", { name: "Thêm nhân viên" }));
    expect(await within(form).findByText("Email này đã được đăng ký cho một tài khoản khác.")).toBeVisible();

    await user.clear(within(form).getByLabelText("Email đăng nhập"));
    await user.type(within(form).getByLabelText("Email đăng nhập"), "Kho@SachLuat.vn");
    await user.click(within(form).getByRole("button", { name: "Thêm nhân viên" }));

    expect(await screen.findByText(/Đã thêm Thủ kho/)).toBeVisible();
    expect(body).toEqual({
      email: "kho@sachluat.vn",
      fullName: "Người trùng",
      password: "mat-khau-tam",
      roles: ["warehouse_keeper"],
    });
  });

  it("đổi vai trò bằng danh sách đầy đủ", async () => {
    useUsers([ADMIN, KEEPER]);
    let body: unknown;
    server.use(
      http.put(`${ORIGIN}/api/v1/admin/users/2/roles`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...KEEPER, roles: ["warehouse_keeper", "accountant"] });
      }),
    );
    const user = userEvent.setup();
    renderList();

    const row = await rowOf("Thủ kho");
    await user.click(within(row).getByRole("button", { name: /Đổi vai trò/ }));
    const form = within(row).getByRole("form", { name: /Đổi vai trò của Thủ kho/ });
    expect(within(form).getByRole("checkbox", { name: "Thủ kho" })).toBeChecked();
    await user.click(within(form).getByRole("checkbox", { name: "Kế toán" }));
    await user.click(within(form).getByRole("button", { name: "Lưu vai trò" }));

    expect(await screen.findByText("Đã cập nhật vai trò của Thủ kho.")).toBeVisible();
    expect(body).toEqual({ roles: ["warehouse_keeper", "accountant"] });
  });

  it("đặt mật khẩu mới sau khi kiểm tra độ dài", async () => {
    useUsers([ADMIN, KEEPER]);
    let body: unknown;
    server.use(
      http.put(`${ORIGIN}/api/v1/admin/users/2/password`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderList();

    const row = await rowOf("Thủ kho");
    await user.click(within(row).getByRole("button", { name: /Đặt mật khẩu mới/ }));
    const form = within(row).getByRole("form", { name: /Đặt mật khẩu mới cho Thủ kho/ });
    await user.type(within(form).getByLabelText("Mật khẩu mới"), "ngan");
    await user.click(within(form).getByRole("button", { name: "Đặt mật khẩu" }));
    expect(await within(form).findByText("Mật khẩu tối thiểu 8 ký tự.")).toBeVisible();
    expect(body).toBeUndefined();

    await user.clear(within(form).getByLabelText("Mật khẩu mới"));
    await user.type(within(form).getByLabelText("Mật khẩu mới"), "mat-khau-moi-123");
    await user.click(within(form).getByRole("button", { name: "Đặt mật khẩu" }));

    expect(await screen.findByText(/Đã đặt mật khẩu mới cho Thủ kho/)).toBeVisible();
    expect(body).toEqual({ newPassword: "mat-khau-moi-123" });
  });

  it("vô hiệu hóa rồi kích hoạt lại tài khoản", async () => {
    const users = useUsers([ADMIN, KEEPER]);
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/users/2/deactivate`, () => {
        users.update(2, { isActive: false });
        return HttpResponse.json(users.find(2));
      }),
      http.post(`${ORIGIN}/api/v1/admin/users/2/activate`, () => {
        users.update(2, { isActive: true });
        return HttpResponse.json(users.find(2));
      }),
    );
    const user = userEvent.setup();
    renderList();

    const row = await rowOf("Thủ kho");
    await user.click(within(row).getByRole("button", { name: "Vô hiệu hóa" }));
    await user.click(within(row).getByRole("button", { name: "Vô hiệu hóa" }));
    expect(await within(row).findByText("Đã vô hiệu hóa")).toBeVisible();

    await user.click(within(row).getByRole("button", { name: /Kích hoạt lại/ }));
    await vi.waitFor(() => expect(within(row).queryByText("Đã vô hiệu hóa")).not.toBeInTheDocument());
  });

  it("đăng xuất hộ và báo số phiên đã thu hồi", async () => {
    useUsers([ADMIN, KEEPER]);
    server.use(http.post(`${ORIGIN}/api/v1/admin/users/2/logout`, () => HttpResponse.json({ revokedSessions: 3 })));
    const user = userEvent.setup();
    renderList();

    const row = await rowOf("Thủ kho");
    await user.click(within(row).getByRole("button", { name: "Đăng xuất hộ" }));
    await user.click(within(row).getByRole("button", { name: "Đăng xuất" }));

    expect(await screen.findByText(/Đã đăng xuất Thủ kho \(3 phiên\)/)).toBeVisible();
  });

  it("báo lỗi của backend khi vô hiệu hóa thất bại", async () => {
    useUsers([ADMIN, KEEPER]);
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/users/2/deactivate`, () =>
        HttpResponse.json({ title: "x", status: 422, code: "CANNOT_MANAGE_USER" }, { status: 422 }),
      ),
    );
    const user = userEvent.setup();
    renderList();

    const row = await rowOf("Thủ kho");
    await user.click(within(row).getByRole("button", { name: "Vô hiệu hóa" }));
    await user.click(within(row).getByRole("button", { name: "Vô hiệu hóa" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể đổi mật khẩu hoặc trạng thái");
  });
});
