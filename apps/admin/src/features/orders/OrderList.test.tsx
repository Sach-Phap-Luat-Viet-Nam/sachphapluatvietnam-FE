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
  it("liệt kê đơn, cả hàng là link sang chi tiết", async () => {
    renderList();

    expect(await screen.findByRole("link", { name: "SLVN2610230001" })).toHaveAttribute(
      "href",
      "/don-hang/SLVN2610230001",
    );
    const list = within(screen.getByRole("list", { name: "Danh sách đơn hàng" }));
    expect(list.getByText("Chờ xác nhận")).toBeVisible();
    expect(list.getByText("300.000 ₫")).toBeVisible();
    expect(screen.getByText("1 đơn hàng")).toBeVisible();
  });

  it("lọc ngay khi bấm nút trạng thái và thanh toán, không cần nút Lọc", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "SLVN2610230001" });
    expect(screen.queryByRole("button", { name: "Lọc" })).not.toBeInTheDocument();

    await user.click(
      within(screen.getByRole("group", { name: "Trạng thái" })).getByRole("button", { name: "Chờ xác nhận" }),
    );
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]?.get("Status")).toBe("pending_confirm");
    expect(screen.getByRole("button", { name: "Chờ xác nhận" })).toHaveAttribute("aria-pressed", "true");

    await user.click(within(screen.getByRole("group", { name: "Thanh toán" })).getByRole("button", { name: "COD" }));
    await vi.waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2]?.get("PaymentMethod")).toBe("cod");
    expect(requests[2]?.get("Status")).toBe("pending_confirm");
    expect(requests[2]?.get("Page")).toBe("1");
  });

  it("tìm tự động sau khi ngừng gõ và chuẩn hóa số điện thoại", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "SLVN2610230001" });

    await user.type(screen.getByLabelText("Mã đơn hoặc số điện thoại"), "0901 234 567");
    await vi.waitFor(() => expect(requests.at(-1)?.get("Q")).toBe("0901234567"));
    // Gõ liên tục không gọi API cho từng phím.
    expect(requests.length).toBeLessThanOrEqual(3);
  });

  it("nút chọn nhanh khoảng ngày và gõ ngày thủ công đều gửi From/To", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "SLVN2610230001" });

    await user.click(screen.getByRole("button", { name: "Hôm nay" }));
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    const today = requests[1]?.get("From");
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(requests[1]?.get("To")).toBe(today);

    await user.clear(screen.getByLabelText("Đặt từ ngày"));
    await user.type(screen.getByLabelText("Đặt từ ngày"), "01102026");
    await user.clear(screen.getByLabelText("Đến ngày"));
    await user.type(screen.getByLabelText("Đến ngày"), "24102026");
    await vi.waitFor(() => expect(requests.at(-1)?.get("From")).toBe("2026-10-01"));
    expect(requests.at(-1)?.get("To")).toBe("2026-10-24");
  });

  it("khoảng ngày ngược: báo lỗi và bỏ ô sai khỏi query", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "SLVN2610230001" });

    await user.click(screen.getByRole("button", { name: "Chọn ngày" }));
    await user.type(screen.getByLabelText("Đặt từ ngày"), "24102026");
    await user.type(screen.getByLabelText("Đến ngày"), "01102026");

    expect(await screen.findByText("Ngày kết thúc phải từ ngày bắt đầu trở đi.")).toBeVisible();
    await vi.waitFor(() => expect(requests.at(-1)?.get("From")).toBe("2026-10-24"));
    expect(requests.at(-1)?.get("To")).toBeNull();
  });

  it("không có đơn phù hợp thì nói rõ, xóa bộ lọc để quay lại", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "SLVN2610230001" });

    await user.type(screen.getByLabelText("Mã đơn hoặc số điện thoại"), "slvn0000000000");
    expect(await screen.findByText("Không có đơn hàng phù hợp.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(await screen.findByRole("link", { name: "SLVN2610230001" })).toBeVisible();
    expect(screen.getByLabelText("Mã đơn hoặc số điện thoại")).toHaveValue("");
  });

  it("làm mới gọi lại API", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByRole("link", { name: "SLVN2610230001" });

    await user.click(screen.getByRole("button", { name: "Làm mới danh sách đơn" }));
    await vi.waitFor(() => expect(requests).toHaveLength(2));
  });
});
