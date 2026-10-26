import type { ReactElement } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { clearSession, startSession } from "@slvn/auth";
import { addressHandlers } from "@/mocks/address-handlers";
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

/** Response `POST /checkout/preview`: 2 cuốn × 150.000, mặc định không giảm giá và miễn phí ship. */
function preview(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        skuId: 100,
        skuCode: "SLVN-BLDS-2026-BM",
        bookTitle: "Bộ luật Dân sự 2026",
        editionName: "Tái bản lần 3",
        coverType: "paperback",
        unitPrice: 150000,
        quantity: 2,
        lineTotal: 300000,
        discountAmount: 0,
      },
    ],
    subtotal: 300000,
    discount: 0,
    shippingFee: 0,
    shippingDiscount: 0,
    total: 300000,
    appliedPromotions: [],
    couponApplied: null,
    freeShippingThreshold: 300000,
    amountToFreeShipping: 0,
    eta: null,
    zoneName: null,
    ...overrides,
  };
}

function previewHandler(response: () => Response | Promise<Response> = () => HttpResponse.json(preview())) {
  return http.post(`${ORIGIN}/api/v1/checkout/preview`, response);
}

function baseHandlers() {
  return [http.get(`${ORIGIN}/api/v1/cart`, () => HttpResponse.json(CART)), previewHandler()];
}

/** Nút đặt hàng khóa trong lúc số tiền đang được tính lại (debounce + preview), nên chờ nó mở rồi mới bấm. */
async function submit(user: ReturnType<typeof userEvent.setup>) {
  const button = await screen.findByRole("button", { name: "Đặt hàng" });
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
}

function renderCheckout(ui: ReactElement = <Checkout />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function fillRecipient(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Họ và tên"), "Nguyễn Văn A");
  await user.type(screen.getByLabelText("Số điện thoại"), "090 123 4567");
  await user.selectOptions(screen.getByLabelText("Tỉnh/Thành phố"), "Hà Nội");
  await user.type(screen.getByLabelText("Phường/Xã"), "Phường Cầu Giấy");
  await user.type(screen.getByLabelText("Số nhà, tên đường"), "1 Xuân Thủy");
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
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

    await submit(user);
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
    await submit(user);

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
      expectedTotal: 300000,
    });
  });

  it("links members to the order in their account after placing it", async () => {
    server.use(
      ...baseHandlers(),
      // Hồ sơ, sổ địa chỉ không có: form để trống như khách vãng lai.
      http.get(`${ORIGIN}/api/v1/me`, () => problem(404, "NOT_FOUND")),
      http.get(`${ORIGIN}/api/v1/me/addresses`, () => problem(404, "NOT_FOUND")),
      http.post(`${ORIGIN}/api/v1/orders`, () => HttpResponse.json(order(), { status: 201 })),
    );
    startSession({
      accessToken: "token-1",
      expiresIn: 900,
      user: {
        id: 12,
        email: "a@example.com",
        fullName: "Nguyễn Văn A",
        roles: ["customer"],
        requiresTwoFactorSetup: false,
      },
    });
    const user = userEvent.setup();
    renderCheckout();

    await fillRecipient(user);
    await submit(user);

    expect(await screen.findByRole("link", { name: "Xem đơn của tôi" })).toHaveAttribute(
      "href",
      "/don-hang/SLVN2610230001",
    );
  });

  it("prefills members from their profile and saved addresses, and saves a new address", async () => {
    let orderBody: unknown;
    const home = {
      id: 1,
      recipientName: "Trần Thị B",
      phone: "0912345678",
      province: "Hà Nội",
      ward: "Phường Cầu Giấy",
      streetAddress: "1 Xuân Thủy",
      isDefault: true,
      updatedAt: "2026-10-20T03:00:00Z",
    };
    const office = { ...home, id: 2, ward: "Phường Bến Nghé", province: "TP. Hồ Chí Minh", isDefault: false };
    server.use(
      ...baseHandlers(),
      http.get(`${ORIGIN}/api/v1/me`, () =>
        HttpResponse.json({
          id: 12,
          email: "a@example.com",
          fullName: "Nguyễn Văn A",
          phoneNumber: "0901234567",
          birthDate: null,
          occupation: null,
          defaultAddress: home,
          invoiceInfo: null,
        }),
      ),
      ...addressHandlers([home, office]),
      http.post(`${ORIGIN}/api/v1/orders`, async ({ request }) => {
        orderBody = await request.json();
        return HttpResponse.json(order(), { status: 201 });
      }),
    );
    startSession({
      accessToken: "token-1",
      expiresIn: 900,
      user: {
        id: 12,
        email: "a@example.com",
        fullName: "Nguyễn Văn A",
        roles: ["customer"],
        requiresTwoFactorSetup: false,
      },
    });
    const user = userEvent.setup();
    renderCheckout();

    // Địa chỉ mặc định được chọn sẵn và điền vào form; email lấy từ hồ sơ.
    expect(await screen.findByRole("radio", { name: /Phường Cầu Giấy/ })).toBeChecked();
    await vi.waitFor(() => expect(screen.getByLabelText("Tỉnh/Thành phố")).toHaveValue("Hà Nội"));
    expect(screen.getByLabelText("Họ và tên")).toHaveValue("Trần Thị B");
    expect(screen.getByLabelText("Email (không bắt buộc)")).toHaveValue("a@example.com");
    expect(screen.queryByLabelText("Lưu địa chỉ này vào sổ địa chỉ")).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Phường Bến Nghé/ }));
    expect(screen.getByLabelText("Tỉnh/Thành phố")).toHaveValue("TP. Hồ Chí Minh");

    await user.click(screen.getByRole("radio", { name: "Giao đến địa chỉ khác" }));
    expect(screen.getByLabelText("Tỉnh/Thành phố")).toHaveValue("");
    await user.selectOptions(screen.getByLabelText("Tỉnh/Thành phố"), "Đà Nẵng");
    await user.type(screen.getByLabelText("Phường/Xã"), "Phường Hải Châu");
    await user.type(screen.getByLabelText("Số nhà, tên đường"), "3 Bạch Đằng");
    await user.click(screen.getByLabelText("Lưu địa chỉ này vào sổ địa chỉ"));
    await submit(user);

    expect(await screen.findByText("Đã lưu địa chỉ vào sổ địa chỉ.")).toBeVisible();
    expect(orderBody).toMatchObject({
      customerName: "Trần Thị B",
      phone: "0912345678",
      email: "a@example.com",
      shippingAddress: { province: "Đà Nẵng", ward: "Phường Hải Châu", streetAddress: "3 Bạch Đằng" },
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
    await submit(user);

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
    await submit(user);
    expect(await screen.findByText("Vui lòng nhập tên công ty.")).toBeVisible();

    await user.type(screen.getByLabelText("Tên công ty"), "Công ty Luật A");
    await user.type(screen.getByLabelText("Mã số thuế"), "0101234567-001");
    await user.type(screen.getByLabelText("Email nhận hóa đơn"), "ketoan@luat-a.vn");
    await user.type(screen.getByLabelText("Địa chỉ công ty"), "Hà Nội");
    await submit(user);

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
    await submit(user);

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
    await submit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("không còn đủ số lượng");
    expect(screen.getByRole("link", { name: "Xem lại giỏ hàng" })).toHaveAttribute("href", "/gio-hang");
    expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeEnabled();
  });

  it("shows the transfer details and QR returned by the backend after a bank transfer order", async () => {
    server.use(
      ...baseHandlers(),
      http.post(`${ORIGIN}/api/v1/orders`, () =>
        HttpResponse.json(
          order({
            status: "pending_payment",
            paymentMethod: "bank_transfer",
            paymentExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
            paymentInstructions: {
              bankName: "Ngân hàng A",
              accountNumber: "0123456789",
              accountName: "CONG TY SACH LUAT",
              amount: 300000,
              transferContent: "SLVN2610230001",
              qrUrl: "https://qr.sepay.vn/img?acc=0123456789&bank=MBBank&amount=300000&des=SLVN2610230001",
            },
          }),
          { status: 201 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderCheckout();

    await fillRecipient(user);
    await user.click(screen.getByRole("radio", { name: /Chuyển khoản ngân hàng/ }));
    await submit(user);

    expect(await screen.findByRole("heading", { name: "Chuyển khoản để hoàn tất đơn" })).toBeVisible();
    expect(screen.getByText("0123456789")).toBeVisible();
    expect(screen.getByRole("img", { name: /Mã QR chuyển khoản/ })).toHaveAttribute(
      "src",
      expect.stringContaining("qr.sepay.vn"),
    );
    expect(screen.getByText(/Thời hạn chuyển khoản còn/)).toBeVisible();
  });

  it("offers cash on delivery by default and bank transfer as an option", async () => {
    server.use(...baseHandlers());
    renderCheckout();
    expect(await screen.findByRole("radio", { name: /Thanh toán khi nhận hàng/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Chuyển khoản ngân hàng/ })).toBeVisible();
  });
});

const BOOK = {
  title: "Bộ luật Dân sự 2026",
  slug: "bo-luat-dan-su-2026",
  editions: [
    {
      editionName: "Tái bản lần 3",
      coverImageUrl: null,
      status: "on_sale",
      skus: [{ id: 100, coverType: "paperback", salePrice: 150000, listPrice: 200000, inStock: true }],
    },
  ],
};
const BUY_NOW = { slug: "bo-luat-dan-su-2026", skuId: 100, quantity: 2 };

function buyNowHandlers(...books: (typeof BOOK)[]) {
  let calls = 0;
  return [
    // Lần tải thứ n trả `books[n]` (giữ bản cuối) để giả lập tồn kho đổi giữa chừng.
    http.get(`${ORIGIN}/api/v1/books/bo-luat-dan-su-2026`, () =>
      HttpResponse.json(books[Math.min(calls++, books.length - 1)] ?? BOOK),
    ),
    previewHandler(() =>
      HttpResponse.json(preview({ shippingFee: 30000, total: 330000, freeShippingThreshold: 500000 })),
    ),
  ];
}

describe("Checkout (Mua ngay)", () => {
  it("orders just the chosen book with an Idempotency-Key, without reading or clearing the cart", async () => {
    let body: unknown;
    let key: string | null = null;
    let cartTouched = false;
    server.use(
      ...buyNowHandlers(BOOK),
      http.all(`${ORIGIN}/api/v1/cart*`, () => {
        cartTouched = true;
        return HttpResponse.json(CART);
      }),
      http.post(`${ORIGIN}/api/v1/orders/buy-now`, async ({ request }) => {
        body = await request.json();
        key = request.headers.get("Idempotency-Key");
        return HttpResponse.json(order(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderCheckout(<Checkout buyNow={BUY_NOW} />);

    expect(await screen.findByText("Tái bản lần 3 · Bìa mềm")).toBeVisible();
    expect(screen.getByText("SL: 2 × 150.000 ₫")).toBeVisible();
    expect(await screen.findByText("330.000 ₫")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Quay lại trang sách" })[0]).toHaveAttribute(
      "href",
      "/sach/bo-luat-dan-su-2026",
    );

    await fillRecipient(user);
    await submit(user);

    expect(await screen.findByRole("heading", { name: "Cảm ơn bạn đã đặt sách" })).toBeVisible();
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(body).toEqual({
      skuId: 100,
      quantity: 2,
      customerName: "Nguyễn Văn A",
      phone: "0901234567",
      email: null,
      shippingAddress: { province: "Hà Nội", ward: "Phường Cầu Giấy", streetAddress: "1 Xuân Thủy" },
      paymentMethod: "cod",
      invoiceInfo: null,
      note: null,
      expectedTotal: 330000,
    });
    expect(cartTouched).toBe(false);
  });

  it("keeps the form and points back to the book when stock ran out at order time", async () => {
    const soldOut = {
      ...BOOK,
      editions: BOOK.editions.map((edition) => ({
        ...edition,
        skus: edition.skus.map((sku) => ({ ...sku, inStock: false })),
      })),
    };
    server.use(
      ...buyNowHandlers(BOOK, soldOut),
      http.post(`${ORIGIN}/api/v1/orders/buy-now`, () => problem(409, "OUT_OF_STOCK")),
    );
    const user = userEvent.setup();
    renderCheckout(<Checkout buyNow={BUY_NOW} />);

    await fillRecipient(user);
    await submit(user);

    const alert = await screen.findByText(/quay lại trang sách để chọn lại số lượng/);
    expect(within(alert).getByRole("link", { name: "Quay lại trang sách" })).toHaveAttribute(
      "href",
      "/sach/bo-luat-dan-su-2026",
    );
    // Tải lại sách thấy đã hết hàng: chặn nút đặt nhưng không mất thông tin khách đã nhập.
    expect(await screen.findByText(/Sách đang tạm hết hàng/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeDisabled();
    expect(screen.getByLabelText("Họ và tên")).toHaveValue("Nguyễn Văn A");
  });

  it("explains a tampered link and a SKU that no longer belongs to the book", async () => {
    server.use(...buyNowHandlers(BOOK));
    const { unmount } = renderCheckout(<Checkout buyNow="invalid" />);
    expect(screen.getByRole("heading", { name: "Liên kết không hợp lệ" })).toBeVisible();
    unmount();

    renderCheckout(<Checkout buyNow={{ ...BUY_NOW, skuId: 999 }} />);
    expect(await screen.findByRole("heading", { name: "Sách không còn bán" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Quay lại trang sách" })).toHaveAttribute(
      "href",
      "/sach/bo-luat-dan-su-2026",
    );
  });
});

describe("Checkout (khuyến mãi và phí vận chuyển)", () => {
  const coupon10 = preview({
    discount: 30000,
    total: 270000,
    couponApplied: true,
    appliedPromotions: [
      { promotionId: 7, name: "Giảm 10% đơn đầu", kind: "order_discount", couponCode: "GIAM10", amount: 30000 },
    ],
  });

  it("applies a coupon, shows the discount from the backend and sends the code with the expected total", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.get(`${ORIGIN}/api/v1/cart`, () => HttpResponse.json(CART)),
      previewHandler(async () => HttpResponse.json(preview())),
      http.post(`${ORIGIN}/api/v1/orders`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(order(), { status: 201 });
      }),
    );
    server.use(
      http.post(`${ORIGIN}/api/v1/checkout/preview`, async ({ request }) => {
        const sent = (await request.json()) as { couponCode?: string };
        return HttpResponse.json(sent.couponCode === "GIAM10" ? coupon10 : preview());
      }),
    );
    const user = userEvent.setup();
    renderCheckout();

    await user.type(await screen.findByLabelText("Mã giảm giá"), "giam10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByText("Mã GIAM10")).toBeVisible();
    const offers = await screen.findByRole("list", { name: "Ưu đãi đã áp" });
    expect(within(offers).getByText("Giảm 10% đơn đầu")).toBeVisible();
    expect(await screen.findByText("270.000 ₫")).toBeVisible();

    await fillRecipient(user);
    await submit(user);
    await screen.findByRole("heading", { name: "Cảm ơn bạn đã đặt sách" });
    expect(body).toMatchObject({ couponCode: "GIAM10", expectedTotal: 270000 });
  });

  it("shows the backend message under the coupon input and keeps no code when it is rejected", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/cart`, () => HttpResponse.json(CART)),
      http.post(`${ORIGIN}/api/v1/checkout/preview`, async ({ request }) => {
        const sent = (await request.json()) as { couponCode?: string };
        return sent.couponCode
          ? HttpResponse.json(
              {
                status: 422,
                code: "COUPON_MIN_ORDER",
                title: "Đơn cần đạt tối thiểu 500.000 ₫ để dùng mã này.",
                traceId: "t",
              },
              { status: 422 },
            )
          : HttpResponse.json(preview());
      }),
    );
    const user = userEvent.setup();
    renderCheckout();

    await user.type(await screen.findByLabelText("Mã giảm giá"), "BIGSALE");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByText("Đơn cần đạt tối thiểu 500.000 ₫ để dùng mã này.")).toBeVisible();
    expect(screen.queryByText("Mã BIGSALE")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Mã giảm giá")).toBeVisible();
  });

  it("recalculates and asks the customer to confirm again when the total changed", async () => {
    const keys: (string | null)[] = [];
    const totals: unknown[] = [];
    let total = 300000;
    server.use(
      http.get(`${ORIGIN}/api/v1/cart`, () => HttpResponse.json(CART)),
      previewHandler(() => HttpResponse.json(preview({ total }))),
      http.post(`${ORIGIN}/api/v1/orders`, async ({ request }) => {
        keys.push(request.headers.get("Idempotency-Key"));
        totals.push(((await request.json()) as { expectedTotal: number }).expectedTotal);
        if (keys.length === 1) {
          total = 330000; // Khuyến mãi hết đúng lúc khách bấm đặt.
          return problem(409, "CHECKOUT_TOTAL_CHANGED");
        }
        return HttpResponse.json(order(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderCheckout();

    await fillRecipient(user);
    await submit(user);

    expect(await screen.findByText(/Giá đơn hàng vừa thay đổi/)).toBeVisible();
    expect(await screen.findByText("330.000 ₫")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Cảm ơn bạn đã đặt sách" })).not.toBeInTheDocument();

    await submit(user);
    await screen.findByRole("heading", { name: "Cảm ơn bạn đã đặt sách" });
    expect(totals).toEqual([300000, 330000]);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("blocks ordering when the province is outside the delivery zones", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/cart`, () => HttpResponse.json(CART)),
      http.post(`${ORIGIN}/api/v1/checkout/preview`, async ({ request }) => {
        const sent = (await request.json()) as { province?: string };
        return sent.province ? problem(422, "ADDRESS_NOT_SUPPORTED") : HttpResponse.json(preview());
      }),
    );
    const user = userEvent.setup();
    renderCheckout();

    await user.selectOptions(await screen.findByLabelText("Tỉnh/Thành phố"), "Cà Mau");

    expect((await screen.findAllByText("Chưa hỗ trợ giao đến địa chỉ này.")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeDisabled();
  });

  it("shows shipping discount, free shipping hint and delivery estimate", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/cart`, () => HttpResponse.json(CART)),
      previewHandler(() =>
        HttpResponse.json(
          preview({
            shippingFee: 30000,
            shippingDiscount: 30000,
            total: 300000,
            amountToFreeShipping: 50000,
            eta: { minDays: 2, maxDays: 4 },
          }),
        ),
      ),
    );
    renderCheckout();

    expect(await screen.findByText("Miễn phí")).toBeVisible();
    expect(screen.getByText("Mua thêm 50.000 ₫ để được miễn phí vận chuyển.")).toBeVisible();
    expect(screen.getByText("Dự kiến giao 2–4 ngày.")).toBeVisible();
  });
});
