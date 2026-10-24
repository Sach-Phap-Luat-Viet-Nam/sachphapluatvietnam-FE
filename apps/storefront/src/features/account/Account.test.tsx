import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { clearSession, startSession } from "@slvn/auth";
import { addressHandlers } from "@/mocks/address-handlers";
import { Account } from "./Account";

const ORIGIN = window.location.origin;
const server = setupServer();

const USER = {
  id: 12,
  email: "khach@example.com",
  fullName: "Nguyễn Văn A",
  roles: ["customer"],
  requiresTwoFactorSetup: false,
};
const PROFILE = { ...USER, phoneNumber: "0901234567", birthDate: null, occupation: null, twoFactorEnabled: false };

const HOME = {
  id: 1,
  recipientName: "Nguyễn Văn A",
  phone: "0901234567",
  province: "Hà Nội",
  ward: "Phường Cầu Giấy",
  streetAddress: "1 Xuân Thủy",
  isDefault: true,
};

function renderAccount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Account />
    </QueryClientProvider>,
  );
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => startSession({ accessToken: "token-1", expiresIn: 900, user: USER }));
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

describe("Account", () => {
  it("saves the profile with all four fields", async () => {
    let body: unknown;
    server.use(
      http.get(`${ORIGIN}/api/v1/me`, () => HttpResponse.json(PROFILE)),
      http.patch(`${ORIGIN}/api/v1/me`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...PROFILE, phoneNumber: "0909999999", occupation: "lawyer" });
      }),
      ...addressHandlers(),
    );
    const user = userEvent.setup();
    renderAccount();

    const phone = await screen.findByLabelText("Số điện thoại");
    expect(screen.getByText("khach@example.com")).toBeVisible();
    await user.clear(phone);
    await user.type(phone, "0909 999 999");
    await user.selectOptions(screen.getByLabelText("Nghề nghiệp"), "lawyer");
    await user.click(screen.getByRole("button", { name: "Lưu thông tin" }));

    expect(await screen.findByText("Đã lưu thông tin.")).toBeVisible();
    expect(body).toEqual({
      fullName: "Nguyễn Văn A",
      phoneNumber: "0909999999",
      birthDate: null,
      occupation: "lawyer",
    });
  });

  it("adds, sets default and deletes saved addresses", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/me`, () => HttpResponse.json(PROFILE)),
      ...addressHandlers([HOME]),
    );
    const user = userEvent.setup();
    renderAccount();

    expect(await screen.findByText("1 Xuân Thủy, Phường Cầu Giấy, Hà Nội")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Thêm địa chỉ" }));
    const form = screen.getByRole("form", { name: "Thêm địa chỉ" });
    // Người nhận, số điện thoại điền sẵn từ hồ sơ.
    expect(within(form).getByLabelText("Tên người nhận")).toHaveValue("Nguyễn Văn A");
    await user.type(within(form).getByLabelText("Tỉnh/Thành phố"), "TP. Hồ Chí Minh");
    await user.type(within(form).getByLabelText("Phường/Xã"), "Phường Bến Nghé");
    await user.type(within(form).getByLabelText("Số nhà, tên đường"), "2 Lê Duẩn");
    await user.click(within(form).getByRole("button", { name: "Lưu địa chỉ" }));

    const office = (await screen.findByText("2 Lê Duẩn, Phường Bến Nghé, TP. Hồ Chí Minh")).closest("li");
    if (!office) throw new Error("Không thấy địa chỉ vừa thêm");
    await user.click(within(office).getByRole("button", { name: "Đặt làm mặc định" }));
    expect(await within(office).findByText("Mặc định")).toBeVisible();

    await user.click(within(office).getByRole("button", { name: "Xóa" }));
    await user.click(within(office).getByRole("button", { name: "Xóa" }));
    await vi.waitFor(() =>
      expect(screen.queryByText("2 Lê Duẩn, Phường Bến Nghé, TP. Hồ Chí Minh")).not.toBeInTheDocument(),
    );
    // Xóa địa chỉ mặc định thì địa chỉ còn lại thành mặc định.
    expect(await screen.findByText("Mặc định")).toBeVisible();
  });

  it("explains that the address book is coming when the backend has no API yet", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/me`, () => HttpResponse.json(PROFILE)),
      http.get(`${ORIGIN}/api/v1/me/addresses`, () =>
        HttpResponse.json({ title: "Not found", status: 404, code: "NOT_FOUND" }, { status: 404 }),
      ),
    );
    renderAccount();
    expect(await screen.findByText(/Sổ địa chỉ đang được hoàn thiện/)).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("asks guests to sign in", async () => {
    clearSession();
    renderAccount();
    expect(await screen.findByRole("heading", { name: "Đăng nhập để xem tài khoản" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute("href", "/dang-nhap?next=%2Ftai-khoan");
  });
});
