import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { OrderPlaced } from "./OrderPlaced";
import { MEMBER_POLL_MS } from "./payment";
import { orderSchema } from "./schemas";

const ORIGIN = window.location.origin;
const server = setupServer();

function rawOrder(overrides: Record<string, unknown> = {}) {
  return {
    orderCode: "SLVN2610230001",
    status: "pending_payment",
    paymentMethod: "bank_transfer",
    paymentStatus: "unpaid",
    customerName: "Nguyễn Văn A",
    phone: "0901234567",
    email: null,
    shippingAddress: { province: "Hà Nội", ward: "Phường Cầu Giấy", streetAddress: "1 Xuân Thủy" },
    items: [],
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
    history: [],
    ...overrides,
  };
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() =>
  startSession({
    accessToken: "token-1",
    expiresIn: 900,
    user: {
      id: 12,
      email: "khach@example.com",
      fullName: "Nguyễn Văn A",
      roles: ["customer"],
      requiresTwoFactorSetup: false,
    },
  }),
);
afterEach(() => {
  vi.useRealTimers();
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

describe("OrderPlaced", () => {
  it("switches to a paid confirmation when the backend reports the transfer was received", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    server.use(
      http.get(`${ORIGIN}/api/v1/orders/SLVN2610230001`, () =>
        HttpResponse.json(rawOrder({ status: "paid", paymentStatus: "paid" })),
      ),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <OrderPlaced order={orderSchema.parse(rawOrder())} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("heading", { name: "Chuyển khoản để hoàn tất đơn" })).toBeVisible();

    await act(() => vi.advanceTimersByTimeAsync(MEMBER_POLL_MS + 100));

    expect(await screen.findByText(/Đã nhận được tiền chuyển khoản/)).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Chuyển khoản để hoàn tất đơn" })).not.toBeInTheDocument();
  });
});
