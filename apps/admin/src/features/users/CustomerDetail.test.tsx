import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { CustomerDetail } from "./CustomerDetail";

const ORIGIN = window.location.origin;
const server = setupServer();

const account = {
  id: 42,
  email: "khach@example.com",
  fullName: "Nguyễn Văn A",
  phoneNumber: "0901234567",
  roles: ["customer"],
  twoFactorEnabled: false,
  requiresTwoFactorSetup: false,
  isActive: true,
  birthDate: null,
  occupation: "lawyer",
};

function detail(isActive = true) {
  return {
    account: { ...account, isActive },
    addresses: [
      {
        id: 7,
        recipientName: "Nguyễn Văn A",
        phone: "0901234567",
        province: "Hà Nội",
        ward: "Phường Cửa Nam",
        streetAddress: "12 Hàng Bài",
        isDefault: true,
        updatedAt: "2026-10-24T05:30:00Z",
      },
    ],
    invoiceInfo: null,
  };
}

function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CustomerDetail customerId={42} />
    </QueryClientProvider>,
  );
}

let active = true;

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  active = true;
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: { id: 1, email: "root@sachluat.vn", fullName: "Root", roles: ["super_admin"], requiresTwoFactorSetup: false },
  });
  server.use(http.get(`${ORIGIN}/api/v1/admin/customers/42`, () => HttpResponse.json(detail(active))));
});
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

describe("CustomerDetail", () => {
  it("hiện hồ sơ, sổ địa chỉ và thông tin hóa đơn", async () => {
    renderDetail();

    expect(await screen.findByRole("heading", { name: "Nguyễn Văn A" })).toBeVisible();
    expect(screen.getByText("Luật sư")).toBeVisible();
    expect(screen.getByText("12 Hàng Bài, Phường Cửa Nam, Hà Nội")).toBeVisible();
    expect(screen.getByText("Khách chưa lưu thông tin xuất hóa đơn.")).toBeVisible();
    expect(screen.getByText("Hoạt động")).toBeVisible();
  });

  it("vô hiệu hóa sau khi xác nhận, ẩn nút đăng nhập hộ", async () => {
    const deactivate = vi.fn(() => {
      active = false;
      return HttpResponse.json({ ...account, isActive: false });
    });
    server.use(http.post(`${ORIGIN}/api/v1/admin/users/42/deactivate`, deactivate));
    const user = userEvent.setup();
    renderDetail();

    expect(await screen.findByRole("button", { name: "Đăng nhập hộ" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Vô hiệu hóa" }));
    await user.click(screen.getByRole("button", { name: "Vô hiệu hóa" }));

    expect(await screen.findByText("Đã vô hiệu hóa Nguyễn Văn A và đăng xuất mọi thiết bị.")).toBeVisible();
    expect(deactivate).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: /Kích hoạt lại/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Đăng nhập hộ" })).not.toBeInTheDocument();
  });

  it("đặt mật khẩu mới bằng PUT /password", async () => {
    let body: unknown;
    server.use(
      http.put(`${ORIGIN}/api/v1/admin/users/42/password`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderDetail();

    await user.click(await screen.findByRole("button", { name: "Đặt mật khẩu mới cho Nguyễn Văn A" }));
    const form = screen.getByRole("form", { name: "Đặt mật khẩu mới cho Nguyễn Văn A" });
    await user.type(within(form).getByLabelText("Mật khẩu mới"), "mat-khau-tam-1");
    await user.click(within(form).getByRole("button", { name: "Đặt mật khẩu" }));

    expect(
      await screen.findByText("Đã đặt mật khẩu mới cho Nguyễn Văn A và đăng xuất mọi thiết bị của họ."),
    ).toBeVisible();
    expect(body).toEqual({ newPassword: "mat-khau-tam-1" });
  });

  it("báo không tìm thấy khi id không phải khách hàng", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/customers/42`, () =>
        HttpResponse.json({ title: "x", status: 404, code: "USER_NOT_FOUND" }, { status: 404 }),
      ),
    );
    renderDetail();

    expect(await screen.findByText(/Không tìm thấy khách hàng này/)).toBeVisible();
  });
});
