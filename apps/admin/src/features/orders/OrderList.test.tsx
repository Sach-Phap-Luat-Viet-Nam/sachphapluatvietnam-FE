import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { OrderList } from "./OrderList";

const ORIGIN = window.location.origin;
const server = setupServer();

const SUMMARY = {
  orderCode: "SLVN2610230001",
  status: "pending_confirm",
  paymentMethod: "cod",
  paymentStatus: "unpaid",
  customerName: "Nguyễn Văn A",
  phone: "0901234567",
  itemCount: 2,
  total: 300000,
  createdAt: "2026-10-23T03:00:00Z",
};

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <OrderList />
    </QueryClientProvider>,
  );
}

const requests: URLSearchParams[] = [];

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  requests.length = 0;
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: {
      id: 2,
      email: "cskh@sachluat.vn",
      fullName: "CSKH",
      roles: ["customer_service"],
      requiresTwoFactorSetup: false,
    },
  });
  server.use(
    http.get(`${ORIGIN}/api/v1/admin/orders`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      const items = params.get("Q") === "SLVN0000000000" ? [] : [SUMMARY];
      return HttpResponse.json({ items, meta: { page: 1, limit: 20, total: items.length } });
    }),
  );
});
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

describe("OrderList", () => {
  it("liệt kê đơn với link sang chi tiết", async () => {
    renderList();

    expect(await screen.findByRole("link", { name: "SLVN2610230001" })).toHaveAttribute(
      "href",
      "/don-hang/SLVN2610230001",
    );
    const table = within(screen.getByRole("table"));
    expect(table.getByText("Chờ xác nhận")).toBeVisible();
    expect(table.getByText("300.000 ₫")).toBeVisible();
  });

  it("gửi bộ lọc đã chuẩn hóa lên backend", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "SLVN2610230001" });

    await user.type(screen.getByLabelText("Mã đơn hoặc số điện thoại"), "0901 234 567");
    await user.selectOptions(screen.getByLabelText("Trạng thái"), "pending_confirm");
    await user.selectOptions(screen.getByLabelText("Thanh toán"), "cod");
    await user.type(screen.getByLabelText("Đặt từ ngày"), "01102026");
    await user.type(screen.getByLabelText("Đến ngày"), "24102026");
    await user.click(screen.getByRole("button", { name: "Lọc" }));

    await vi.waitFor(() => expect(requests).toHaveLength(2));
    const params = requests[1];
    expect(params?.get("Q")).toBe("0901234567");
    expect(params?.get("Status")).toBe("pending_confirm");
    expect(params?.get("PaymentMethod")).toBe("cod");
    expect(params?.get("From")).toBe("2026-10-01");
    expect(params?.get("To")).toBe("2026-10-24");
    expect(params?.get("Page")).toBe("1");
  });

  it("chặn khoảng ngày ngược, không gọi API", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "SLVN2610230001" });

    await user.type(screen.getByLabelText("Đặt từ ngày"), "24102026");
    await user.type(screen.getByLabelText("Đến ngày"), "01102026");
    await user.click(screen.getByRole("button", { name: "Lọc" }));

    expect(await screen.findByText("Ngày kết thúc phải từ ngày bắt đầu trở đi.")).toBeVisible();
    expect(requests).toHaveLength(1);
  });

  it("không có đơn phù hợp thì nói rõ, xóa bộ lọc để quay lại", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "SLVN2610230001" });

    await user.type(screen.getByLabelText("Mã đơn hoặc số điện thoại"), "slvn0000000000");
    await user.click(screen.getByRole("button", { name: "Lọc" }));
    expect(await screen.findByText("Không có đơn hàng phù hợp.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(await screen.findByRole("link", { name: "SLVN2610230001" })).toBeVisible();
    expect(screen.getByLabelText("Mã đơn hoặc số điện thoại")).toHaveValue("");
  });
});
