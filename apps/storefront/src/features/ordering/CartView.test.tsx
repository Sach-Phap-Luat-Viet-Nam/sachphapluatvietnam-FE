import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { CartView } from "./CartView";
import type { Cart, CartItem } from "./schemas";

const ORIGIN = window.location.origin;
const server = setupServer();

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    skuId: 100,
    skuCode: "SLVN-BLDS-2026-BM",
    bookTitle: "Bộ luật Dân sự 2026",
    bookSlug: "bo-luat-dan-su-2026",
    editionName: "Tái bản lần 3",
    coverType: "paperback",
    coverImageUrl: null,
    quantity: 2,
    unitPrice: 100000,
    listPrice: 120000,
    lineTotal: 200000,
    isLatestEdition: true,
    isSellable: true,
    availableQuantity: 13,
    ...overrides,
  };
}

function cartOf(items: CartItem[]): Cart {
  return {
    items,
    totalQuantity: items.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: items.reduce((sum, line) => sum + line.lineTotal, 0),
  };
}

function quote() {
  return http.post(`${ORIGIN}/api/v1/shipping/quote`, () =>
    HttpResponse.json({ shippingFee: 30000, freeShippingThreshold: 300000 }),
  );
}

function renderCart() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CartView />
    </QueryClientProvider>,
  );
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("CartView", () => {
  it("shows the lines, the estimated total and a checkout link", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/cart`, () => HttpResponse.json(cartOf([item()]))),
      quote(),
    );
    renderCart();

    expect(await screen.findByRole("link", { name: "Bộ luật Dân sự 2026" })).toHaveAttribute(
      "href",
      "/sach/bo-luat-dan-su-2026",
    );
    expect(screen.getByText("Tái bản lần 3 · Bìa mềm")).toBeVisible();
    expect(await screen.findByText("30.000 ₫")).toBeVisible();
    expect(screen.getByText("230.000 ₫")).toBeVisible();
    expect(screen.getByText(/Mua thêm 100.000 ₫ để được miễn phí vận chuyển/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Đặt hàng" })).toHaveAttribute("href", "/thanh-toan");
  });

  it("changes quantities and removes lines with the cart returned by the backend", async () => {
    let patched: unknown;
    server.use(
      http.get(`${ORIGIN}/api/v1/cart`, () => HttpResponse.json(cartOf([item()]))),
      http.patch(`${ORIGIN}/api/v1/cart/items/100`, async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json(cartOf([item({ quantity: 3, lineTotal: 300000 })]));
      }),
      http.delete(`${ORIGIN}/api/v1/cart/items/100`, () => HttpResponse.json(cartOf([]))),
      quote(),
    );
    const user = userEvent.setup();
    renderCart();

    await user.click(await screen.findByRole("button", { name: "Tăng số lượng Bộ luật Dân sự 2026" }));
    const quantity = screen.getByRole("group", { name: "Số lượng" });
    expect(await within(quantity).findByText("3")).toBeVisible();
    expect(patched).toEqual({ quantity: 3 });

    await user.click(screen.getByRole("button", { name: "Xóa Bộ luật Dân sự 2026 khỏi giỏ" }));
    expect(await screen.findByRole("heading", { name: "Giỏ sách đang trống" })).toBeVisible();
  });

  it("blocks checkout while a line is discontinued or short of stock", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/cart`, () =>
        HttpResponse.json(
          cartOf([
            item({ isSellable: false }),
            item({ skuId: 101, bookTitle: "Luật Đất đai", quantity: 5, lineTotal: 500000, availableQuantity: 3 }),
          ]),
        ),
      ),
      quote(),
    );
    renderCart();

    expect(await screen.findByText(/Sách này đã ngừng bán/)).toBeVisible();
    expect(screen.getByText("Chỉ còn 3 cuốn. Bạn vui lòng giảm số lượng.")).toBeVisible();
    expect(screen.getByText(/Giỏ có sách đã ngừng bán/)).toBeVisible();
    expect(screen.queryByRole("link", { name: "Đặt hàng" })).not.toBeInTheDocument();
  });

  it("shows the backend reason when a change is rejected", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/cart`, () => HttpResponse.json(cartOf([item()]))),
      http.patch(`${ORIGIN}/api/v1/cart/items/100`, () =>
        HttpResponse.json({ title: "Hết hàng", status: 409, code: "OUT_OF_STOCK" }, { status: 409 }),
      ),
      quote(),
    );
    const user = userEvent.setup();
    renderCart();

    await user.click(await screen.findByRole("button", { name: "Tăng số lượng Bộ luật Dân sự 2026" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("không còn đủ số lượng");
  });

  it("invites an empty cart back to the catalogue", async () => {
    server.use(http.get(`${ORIGIN}/api/v1/cart`, () => HttpResponse.json(cartOf([]))));
    renderCart();
    expect(await screen.findByRole("heading", { name: "Giỏ sách đang trống" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Vào tủ sách" })).toHaveAttribute("href", "/sach");
  });
});
