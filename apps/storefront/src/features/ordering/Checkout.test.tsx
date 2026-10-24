import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Checkout } from "./Checkout";

const ORIGIN = window.location.origin;
const server = setupServer();

const CART = {
  items: [
    {
      skuId: 100,
      skuCode: "SLVN-BLDS-2026-BM",
      bookTitle: "Bộ luật Dân sự 2026",
      bookSlug: "bo-luat-dan-su-2026",
      editionName: "Tái bản lần 3",
      coverType: "paperback",
      coverImageUrl: null,
      quantity: 2,
      unitPrice: 150000,
      listPrice: 200000,
      lineTotal: 300000,
      isLatestEdition: true,
      isSellable: true,
      availableQuantity: 13,
    },
  ],
  totalQuantity: 2,
  subtotal: 300000,
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
    note: null,
    paymentExpiresAt: null,
    canCancel: true,
    createdAt: "2026-10-23T03:00:00Z",
    history: [{ fromStatus: null, toStatus: "pending_confirm", note: null, createdAt: "2026-10-23T03:00:00Z" }],
    ...overrides,
  };
}

function problem(status: number, code: string, errors?: Record<string, string[]>) {
  return HttpResponse.json({ title: code, status, code, traceId: "00-trace", errors }, { status });
}

function baseHandlers() {
  return [
    http.get(`${ORIGIN}/api/v1/cart`, () => HttpResponse.json(CART)),
    http.post(`${ORIGIN}/api/v1/shipping/quote`, () =>
      HttpResponse.json({ shippingFee: 0, freeShippingThreshold: 300000 }),
    ),
  ];
}

function renderCheckout(ui: ReactElement = <Checkout bankAccount={null} />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function fillRecipient(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Họ và tên"), "Nguyễn Văn A");
  await user.type(screen.getByLabelText("Số điện thoại"), "090 123 4567");
  await user.type(screen.getByLabelText("Tỉnh/Thành phố"), "Hà Nội");
  await user.type(screen.getByLabelText("Phường/Xã"), "Phường Cầu Giấy");
  await user.type(screen.getByLabelText("Số nhà, tên đường"), "1 Xuân Thủy");
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("Checkout", () => {
  it("validates the form before calling the backend", async () => {
    let posted = false;
    server.use(
      ...baseHandlers(),
      http.post(`${ORIGIN}/api/v1/orders`, () => {
        posted = true;
        return HttpResponse.json(order(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderCheckout();

    await user.click(await screen.findByRole("button", { name: "Đặt hàng" }));
    expect(await screen.findByText("Vui lòng nhập họ tên người nhận.")).toBeVisible();
    expect(screen.getByText("Số điện thoại gồm 10 số, bắt đầu bằng 0 (hoặc +84).")).toBeVisible();
    expect(screen.getByLabelText("Phường/Xã")).toHaveAttribute("aria-invalid", "true");
    expect(posted).toBe(false);
  });

  it("places the order with an Idempotency-Key and shows the order code", async () => {
    let body: unknown;
    let key: string | null = null;
    server.use(
      ...baseHandlers(),
      http.post(`${ORIGIN}/api/v1/orders`, async ({ request }) => {
        body = await request.json();
        key = request.headers.get("Idempotency-Key");
        return HttpResponse.json(order(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderCheckout();

    await fillRecipient(user);
    await user.type(screen.getByLabelText("Ghi chú cho đơn hàng (không bắt buộc)"), "Giao giờ hành chính");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(await screen.findByRole("heading", { name: "Cảm ơn bạn đã đặt sách" })).toHaveFocus();
    expect(screen.getByText("SLVN2610230001")).toBeVisible();
    expect(screen.getByRole("link", { name: "Tra cứu đơn hàng" })).toHaveAttribute(
      "href",
      "/don-hang/tra-cuu?ma=SLVN2610230001",
    );
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(body).toEqual({
      customerName: "Nguyễn Văn A",
      phone: "0901234567",
      email: null,
      shippingAddress: { province: "Hà Nội", ward: "Phường Cầu Giấy", streetAddress: "1 Xuân Thủy" },
      paymentMethod: "cod",
      invoiceInfo: null,
      note: "Giao giờ hành chính",
    });
  });

  it("maps backend validation errors to the matching fields", async () => {
    server.use(
      ...baseHandlers(),
      http.post(`${ORIGIN}/api/v1/orders`, () =>
        problem(400, "VALIDATION_ERROR", { "shippingAddress.ward": ["Phường/xã không hợp lệ"] }),
      ),
    );
    const user = userEvent.setup();
    renderCheckout();

    await fillRecipient(user);
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(await screen.findByText("Phường/xã không hợp lệ")).toBeVisible();
    expect(screen.getByLabelText("Phường/Xã")).toHaveAttribute("aria-invalid", "true");
  });

  it("sends the company invoice when requested", async () => {
    let body: unknown;
    server.use(
      ...baseHandlers(),
      http.post(`${ORIGIN}/api/v1/orders`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(order(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderCheckout();

    await fillRecipient(user);
    await user.click(screen.getByLabelText("Xuất hóa đơn công ty"));
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
    expect(await screen.findByText("Vui lòng nhập tên công ty.")).toBeVisible();

    await user.type(screen.getByLabelText("Tên công ty"), "Công ty Luật A");
    await user.type(screen.getByLabelText("Mã số thuế"), "0101234567-001");
    await user.type(screen.getByLabelText("Email nhận hóa đơn"), "ketoan@luat-a.vn");
    await user.type(screen.getByLabelText("Địa chỉ công ty"), "Hà Nội");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(await screen.findByRole("heading", { name: "Cảm ơn bạn đã đặt sách" })).toBeVisible();
    expect(body).toMatchObject({
      invoiceInfo: {
        companyName: "Công ty Luật A",
        taxCode: "0101234567-001",
        address: "Hà Nội",
        email: "ketoan@luat-a.vn",
      },
    });
  });

  it("retries once with a new key when the key was used for another order", async () => {
    const keys: Array<string | null> = [];
    server.use(
      ...baseHandlers(),
      http.post(`${ORIGIN}/api/v1/orders`, ({ request }) => {
        keys.push(request.headers.get("Idempotency-Key"));
        return keys.length === 1 ? problem(409, "IDEMPOTENCY_KEY_REUSED") : HttpResponse.json(order(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderCheckout();

    await fillRecipient(user);
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(await screen.findByRole("heading", { name: "Cảm ơn bạn đã đặt sách" })).toBeVisible();
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("sends people back to the cart when stock ran out", async () => {
    server.use(
      ...baseHandlers(),
      http.post(`${ORIGIN}/api/v1/orders`, () => problem(409, "OUT_OF_STOCK")),
    );
    const user = userEvent.setup();
    renderCheckout();

    await fillRecipient(user);
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("không còn đủ số lượng");
    expect(screen.getByRole("link", { name: "Xem lại giỏ hàng" })).toHaveAttribute("href", "/gio-hang");
    expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeEnabled();
  });

  it("offers bank transfer only when a receiving account is configured", async () => {
    server.use(
      ...baseHandlers(),
      http.post(`${ORIGIN}/api/v1/orders`, () =>
        HttpResponse.json(
          order({
            status: "pending_payment",
            paymentMethod: "bank_transfer",
            paymentExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          }),
          { status: 201 },
        ),
      ),
    );
    const user = userEvent.setup();
    const bankAccount = { bankName: "Ngân hàng A", accountNumber: "0123456789", accountName: "CONG TY SACH LUAT" };
    renderCheckout(<Checkout bankAccount={bankAccount} />);

    await fillRecipient(user);
    await user.click(screen.getByRole("radio", { name: /Chuyển khoản ngân hàng/ }));
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(await screen.findByRole("heading", { name: "Chuyển khoản để hoàn tất đơn" })).toBeVisible();
    expect(screen.getByText("0123456789")).toBeVisible();
    expect(screen.getByText(/Thời hạn chuyển khoản còn/)).toBeVisible();
  });

  it("hides bank transfer when no receiving account is configured", async () => {
    server.use(...baseHandlers());
    renderCheckout();
    expect(await screen.findByRole("radio", { name: /Thanh toán khi nhận hàng/ })).toBeChecked();
    expect(screen.queryByRole("radio", { name: /Chuyển khoản/ })).not.toBeInTheDocument();
  });
});
