import { render, screen } from "@testing-library/react";
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
  isLocked: false,
  lockedUntil: null,
  createdAt: "2026-10-24T05:30:00Z",
};

function detail(isLocked = false) {
  return {
    account: { ...account, isLocked },
    birthDate: null,
    occupation: "lawyer",
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

let locked = false;

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  locked = false;
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: { id: 1, email: "root@sachluat.vn", fullName: "Root", roles: ["super_admin"], requiresTwoFactorSetup: false },
  });
  server.use(http.get(`${ORIGIN}/api/v1/admin/customers/42`, () => HttpResponse.json(detail(locked))));
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

  it("khóa tài khoản sau khi xác nhận", async () => {
    const lock = vi.fn(() => {
      locked = true;
      return HttpResponse.json({ ...account, isLocked: true });
    });
    server.use(http.post(`${ORIGIN}/api/v1/admin/users/42/lock`, lock));
    const user = userEvent.setup();
    renderDetail();

    await user.click(await screen.findByRole("button", { name: "Khóa" }));
    await user.click(screen.getByRole("button", { name: "Khóa tài khoản" }));

    expect(await screen.findByText("Đã khóa khach@example.com và đăng xuất mọi phiên.")).toBeVisible();
    expect(lock).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: "Mở khóa" })).toBeVisible();
  });

  it("đặt lại mật khẩu tạm, kiểm tra độ dài trước khi gửi", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/users/42/password/reset`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderDetail();

    await user.click(await screen.findByRole("button", { name: "Đặt lại mật khẩu" }));
    await user.type(screen.getByLabelText("Mật khẩu tạm mới"), "ngan");
    await user.click(screen.getByRole("button", { name: "Đặt mật khẩu" }));
    expect(await screen.findByText("Mật khẩu tối thiểu 8 ký tự.")).toBeVisible();

    await user.clear(screen.getByLabelText("Mật khẩu tạm mới"));
    await user.type(screen.getByLabelText("Mật khẩu tạm mới"), "mat-khau-tam-1");
    await user.click(screen.getByRole("button", { name: "Đặt mật khẩu" }));

    expect(await screen.findByText(/Đã đặt mật khẩu tạm cho khach@example.com/)).toBeVisible();
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
