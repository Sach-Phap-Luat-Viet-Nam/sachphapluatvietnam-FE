import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { CustomerList } from "./CustomerList";
import type { CustomerUser } from "./schemas";

const ORIGIN = window.location.origin;
const server = setupServer();

function customer(id: number, name: string, overrides: Partial<CustomerUser> = {}): CustomerUser {
  return {
    id,
    email: `khach${id}@example.com`,
    fullName: name,
    roles: ["customer"],
    twoFactorEnabled: false,
    requiresTwoFactorSetup: false,
    isActive: true,
    phoneNumber: "0901234567",
    birthDate: null,
    occupation: null,
    ...overrides,
  };
}

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CustomerList />
    </QueryClientProvider>,
  );
}

let query: URLSearchParams | null = null;
let customers = [customer(10, "Nguyễn Văn A"), customer(11, "Trần Thị B", { isActive: false })];

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  customers = [customer(10, "Nguyễn Văn A"), customer(11, "Trần Thị B", { isActive: false })];
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: { id: 1, email: "root@sachluat.vn", fullName: "Root", roles: ["super_admin"], requiresTwoFactorSetup: false },
  });
  server.use(
    http.get(`${ORIGIN}/api/v1/admin/customers`, ({ request }) => {
      query = new URL(request.url).searchParams;
      return HttpResponse.json({ items: customers, meta: { page: 1, limit: 20, total: customers.length } });
    }),
  );
});
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

async function rowOf(name: string) {
  const row = (await screen.findAllByText(name))[0]?.closest("li");
  if (!row) throw new Error(`Không thấy dòng ${name}`);
  return row;
}

describe("CustomerList", () => {
  it("cùng bố cục và thao tác với màn Nhân viên, trừ đổi vai trò", async () => {
    renderList();

    const active = await rowOf("Nguyễn Văn A");
    expect(within(active).getByText("Hoạt động")).toBeVisible();
    expect(within(active).getByText(/0901234567/)).toBeVisible();
    expect(within(active).getByRole("button", { name: "Đăng nhập hộ" })).toBeVisible();
    expect(within(active).getByRole("button", { name: /Đặt mật khẩu mới cho/ })).toBeVisible();
    expect(within(active).getByRole("button", { name: "Đăng xuất hộ" })).toBeVisible();
    expect(within(active).getByRole("button", { name: "Vô hiệu hóa" })).toBeVisible();
    expect(within(active).getByRole("link", { name: /Xem chi tiết/ })).toHaveAttribute("href", "/khach-hang/10");
    expect(within(active).queryByRole("button", { name: /Đổi vai trò/ })).not.toBeInTheDocument();
    expect(within(active).queryByText("Chưa bật 2FA")).not.toBeInTheDocument();

    const disabled = await rowOf("Trần Thị B");
    expect(within(disabled).getByText("Đã vô hiệu hóa")).toBeVisible();
    expect(within(disabled).getByRole("button", { name: /Kích hoạt lại/ })).toBeVisible();
    // Tài khoản đang bị vô hiệu hóa không đăng nhập hộ được.
    expect(within(disabled).queryByRole("button", { name: "Đăng nhập hộ" })).not.toBeInTheDocument();
  });

  it("tìm khách hàng theo từ khóa", async () => {
    const user = userEvent.setup();
    renderList();

    await rowOf("Nguyễn Văn A");
    await user.type(screen.getByLabelText("Email, họ tên hoặc số điện thoại"), " 0901 ");
    await user.click(screen.getByRole("button", { name: "Tìm" }));

    await vi.waitFor(() => expect(query?.get("Q")).toBe("0901"));
  });

  it("vô hiệu hóa khách ngay trên dòng", async () => {
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/users/10/deactivate`, () => {
        customers = customers.map((item) => (item.id === 10 ? { ...item, isActive: false } : item));
        return HttpResponse.json(customers[0]);
      }),
    );
    const user = userEvent.setup();
    renderList();

    const row = await rowOf("Nguyễn Văn A");
    await user.click(within(row).getByRole("button", { name: "Vô hiệu hóa" }));
    await user.click(within(row).getByRole("button", { name: "Vô hiệu hóa" }));

    expect(await within(row).findByText("Đã vô hiệu hóa")).toBeVisible();
    expect(await within(row).findByRole("button", { name: /Kích hoạt lại/ })).toBeVisible();
  });
});
