import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { MyOrder } from "./MyOrder";

const ORIGIN = window.location.origin;
const server = setupServer();

const SESSION = {
  accessToken: "token-1",
  expiresIn: 900,
  user: {
    id: 12,
    email: "khach@example.com",
    fullName: "Nguyễn Văn A",
    roles: ["customer"],
    requiresTwoFactorSetup: false,
  },
};

function order(overrides: Record<string, unknown> = {}) {
  return {
    orderCode: "SLVN2610230001",
    status: "pending_confirm",
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    customerName: "Nguyễn Văn A",
    phone: "0901234567",
    email: null,
    shippingAddress: { province: "Hà Nội", ward: "Phường Cầu Giấy", streetAddress: "1 Xuân Thủy" },
    items: [
      {
        skuId: 100,
        skuCode: "SLVN-BLDS-2026-BM",
        bookTitle: "Bộ luật Dân sự 2026",
        editionName: null,
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
    note: null,
    paymentExpiresAt: null,
    canCancel: true,
    createdAt: "2026-10-23T03:00:00Z",
    history: [{ fromStatus: null, toStatus: "pending_confirm", note: null, createdAt: "2026-10-23T03:00:00Z" }],
    ...overrides,
  };
}

function problem(status: number, code: string) {
  return HttpResponse.json({ title: code, status, code, traceId: "00-trace" }, { status });
}

function renderOrder(ui = <MyOrder code="SLVN2610230001" bankAccount={null} />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeAll(() => {
  // jsdom chưa cài đặt <dialog>.showModal() và close().
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
  server.listen({ onUnhandledFrame: "error" });
});
beforeEach(() => startSession(SESSION));
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

describe("MyOrder", () => {
  it("cancels the order with an optional reason", async () => {
    let cancelBody: unknown;
    server.use(
      http.get(`${ORIGIN}/api/v1/orders/SLVN2610230001`, () => HttpResponse.json(order())),
      http.post(`${ORIGIN}/api/v1/orders/SLVN2610230001/cancel`, async ({ request }) => {
        cancelBody = await request.json();
        return HttpResponse.json(
          order({
            status: "cancelled",
            canCancel: false,
            history: [
              { fromStatus: null, toStatus: "pending_confirm", note: null, createdAt: "2026-10-23T03:00:00Z" },
              {
                fromStatus: "pending_confirm",
                toStatus: "cancelled",
                note: "Đặt nhầm",
                createdAt: "2026-10-23T04:00:00Z",
              },
            ],
          }),
        );
      }),
    );
    const user = userEvent.setup();
    renderOrder();

    await user.click(await screen.findByRole("button", { name: "Hủy đơn hàng" }));
    const dialog = screen.getByRole("dialog", { name: "Hủy đơn SLVN2610230001?" });
    expect(dialog).toBeVisible();
    await user.type(screen.getByLabelText("Lý do hủy (không bắt buộc)"), "Đặt nhầm");
    await user.click(screen.getByRole("button", { name: "Xác nhận hủy đơn" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Đã hủy đơn hàng.");
    expect(cancelBody).toEqual({ reason: "Đặt nhầm" });
    expect(screen.getByText("Đã hủy", { selector: "dd" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Hủy đơn hàng" })).not.toBeInTheDocument();
    expect(dialog).not.toHaveAttribute("open");
  });

  it("sends a null reason and explains when the order can no longer be cancelled", async () => {
    let cancelBody: unknown;
    server.use(
      http.get(`${ORIGIN}/api/v1/orders/SLVN2610230001`, () => HttpResponse.json(order())),
      http.post(`${ORIGIN}/api/v1/orders/SLVN2610230001/cancel`, async ({ request }) => {
        cancelBody = await request.json();
        return problem(422, "ORDER_NOT_CANCELLABLE");
      }),
    );
    const user = userEvent.setup();
    renderOrder();

    await user.click(await screen.findByRole("button", { name: "Hủy đơn hàng" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận hủy đơn" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("không tự hủy được");
    expect(cancelBody).toEqual({ reason: null });
  });

  it("shows a not-found message for orders of other accounts", async () => {
    server.use(http.get(`${ORIGIN}/api/v1/orders/SLVN2610230001`, () => problem(404, "NOT_FOUND")));
    renderOrder();

    expect(await screen.findByRole("heading", { name: "Không tìm thấy đơn hàng" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Đơn của tôi" })).toHaveAttribute("href", "/don-hang");
  });

  it("shows bank transfer instructions while the payment is pending", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/orders/SLVN2610230001`, () =>
        HttpResponse.json(
          order({
            status: "pending_payment",
            paymentMethod: "bank_transfer",
            paymentExpiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
          }),
        ),
      ),
    );
    const bankAccount = { bankName: "Ngân hàng A", accountNumber: "0123456789", accountName: "CONG TY SACH LUAT" };
    renderOrder(<MyOrder code="SLVN2610230001" bankAccount={bankAccount} />);

    expect(await screen.findByRole("heading", { name: "Chuyển khoản để hoàn tất đơn" })).toBeVisible();
    expect(screen.getByText(/Thời hạn chuyển khoản còn/)).toBeVisible();
  });

  it("hides the cancel button once the order is packed", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/orders/SLVN2610230001`, () =>
        HttpResponse.json(order({ status: "packing", canCancel: false })),
      ),
    );
    renderOrder();

    expect(await screen.findByText(/không tự hủy được/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Hủy đơn hàng" })).not.toBeInTheDocument();
  });
});
