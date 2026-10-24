import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { OrderDetail } from "./OrderDetail";

const ORIGIN = window.location.origin;
const CODE = "SLVN2610230001";
const server = setupServer();

function detail(
  status = "pending_confirm",
  nextStatuses = ["confirmed", "cancelled"],
  costOfGoods: number | null = null,
) {
  return {
    order: {
      orderCode: CODE,
      status,
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      customerName: "Nguyễn Văn A",
      phone: "0901234567",
      email: null,
      shippingAddress: { province: "Hà Nội", ward: "Phường Cầu Giấy", streetAddress: "1 Xuân Thủy" },
      items: [
        {
          skuId: 100,
          skuCode: "SLVN-BLDS-BM",
          bookTitle: "Bộ luật Dân sự 2026",
          editionName: "Tái bản lần 3",
          isbn: "9780306406157",
          coverType: "paperback",
          unitPrice: 150000,
          quantity: 2,
          lineTotal: 300000,
        },
      ],
      subtotal: 300000,
      discount: 0,
      shippingFee: 0,
      total: 300000,
      invoiceRequired: false,
      invoiceInfo: null,
      note: "Giao giờ hành chính",
      paymentExpiresAt: null,
      canCancel: true,
      createdAt: "2026-10-23T03:00:00Z",
      history: [{ fromStatus: null, toStatus: "pending_confirm", note: null, createdAt: "2026-10-23T03:00:00Z" }],
    },
    userId: null,
    nextStatuses,
    costOfGoods,
  };
}

function signIn(roles: string[]) {
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: { id: 2, email: "don@sachluat.vn", fullName: "Quản lý đơn", roles, requiresTwoFactorSetup: false },
  });
}

function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <OrderDetail orderCode={CODE} />
    </QueryClientProvider>,
  );
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => server.use(http.get(`${ORIGIN}/api/v1/admin/orders/${CODE}`, () => HttpResponse.json(detail()))));
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

describe("OrderDetail", () => {
  it("hiện khách, địa chỉ, sách, tiền và lịch sử", async () => {
    signIn(["order_manager"]);
    renderDetail();

    expect(await screen.findByRole("heading", { name: `Đơn ${CODE}` })).toBeVisible();
    expect(screen.getByText("Khách vãng lai")).toBeVisible();
    expect(screen.getByText("1 Xuân Thủy, Phường Cầu Giấy, Hà Nội")).toBeVisible();
    expect(screen.getByText(/Tái bản lần 3 · Bìa mềm · SLVN-BLDS-BM · ISBN 9780306406157/)).toBeVisible();
    expect(screen.getByText("Khách không yêu cầu xuất hóa đơn.")).toBeVisible();
    expect(screen.queryByText("Giá vốn hàng xuất")).not.toBeInTheDocument();
  });

  it("chuyển trạng thái theo nextStatuses kèm ghi chú", async () => {
    signIn(["order_manager"]);
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/orders/${CODE}/status`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(detail("confirmed", ["packing", "cancelled"]));
      }),
    );
    const user = userEvent.setup();
    renderDetail();

    await user.click(await screen.findByRole("button", { name: "Chờ xử lý" }));
    await user.type(screen.getByLabelText(/Ghi chú/), "Đã gọi xác nhận");
    await user.click(screen.getByRole("button", { name: "Xác nhận: Chờ xử lý" }));

    expect(await screen.findByText("Đã chuyển đơn sang “Chờ xử lý”.")).toBeVisible();
    expect(body).toEqual({ status: "confirmed", note: "Đã gọi xác nhận" });
    expect(screen.getByRole("button", { name: "Đang đóng gói" })).toBeVisible();
  });

  it("hủy đơn dùng nút đỏ, nêu tác động hoàn tồn; ghi chú trống gửi null", async () => {
    signIn(["super_admin"]);
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/orders/${CODE}/status`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(detail("cancelled", []));
      }),
    );
    const user = userEvent.setup();
    renderDetail();

    await user.click(await screen.findByRole("button", { name: "Đã hủy" }));
    expect(screen.getByText(/Hoàn lại số sách đang giữ/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Xác nhận: Đã hủy" }));

    expect(await screen.findByText("Đơn đã ở trạng thái cuối, không chuyển tiếp được.")).toBeVisible();
    expect(body).toEqual({ status: "cancelled", note: null });
  });

  it("đơn vừa được đổi ở nơi khác thì báo lỗi và tải lại", async () => {
    signIn(["order_manager"]);
    let loads = 0;
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/orders/${CODE}`, () => {
        loads += 1;
        return HttpResponse.json(loads === 1 ? detail() : detail("cancelled", []));
      }),
      http.post(`${ORIGIN}/api/v1/admin/orders/${CODE}/status`, () =>
        HttpResponse.json({ title: "x", status: 409, code: "ORDER_INVALID_TRANSITION" }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderDetail();

    await user.click(await screen.findByRole("button", { name: "Chờ xử lý" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận: Chờ xử lý" }));

    // Thông báo vẫn còn sau khi đơn tải lại và không còn trạng thái kế tiếp.
    expect(await screen.findByText("Đơn đã ở trạng thái cuối, không chuyển tiếp được.")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Đơn vừa được đổi trạng thái ở nơi khác");
    expect(loads).toBe(2);
  });

  it("CSKH chỉ xem, không có nút đổi trạng thái; có giá vốn sau khi đóng gói", async () => {
    signIn(["customer_service"]);
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/orders/${CODE}`, () =>
        HttpResponse.json(detail("packing", ["ready_to_ship"], 90000)),
      ),
    );
    renderDetail();

    expect(await screen.findByText(/chỉ xem đơn/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Chờ lấy hàng" })).not.toBeInTheDocument();
    expect(screen.getByText("Giá vốn hàng xuất")).toBeVisible();
    expect(screen.getByText("90.000 ₫")).toBeVisible();
  });
});
