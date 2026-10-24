import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AddToCartForm } from "./AddToCartForm";
import type { PurchaseOption } from "./AddToCartForm";

const ORIGIN = window.location.origin;
const server = setupServer();

const PAPERBACK: PurchaseOption = {
  skuId: 100,
  label: "Bìa mềm",
  salePrice: 150000,
  listPrice: 200000,
  regularSalePrice: null,
  discountPercent: 25,
  saleEndsAt: null,
  inStock: true,
};
const HARDCOVER: PurchaseOption = { ...PAPERBACK, skuId: 101, label: "Bìa cứng", salePrice: 250000, listPrice: 250000 };

function cart(quantity: number) {
  return {
    items: [],
    totalQuantity: quantity,
    subtotal: quantity * 150000,
  };
}

function renderForm(ui: ReactElement) {
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
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AddToCartForm", () => {
  it("adds the chosen cover and quantity to the cart", async () => {
    let body: unknown;
    server.use(
      http.get(`${ORIGIN}/api/v1/cart`, () => HttpResponse.json(cart(0))),
      http.post(`${ORIGIN}/api/v1/cart/items`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(cart(2));
      }),
    );
    const user = userEvent.setup();
    renderForm(<AddToCartForm options={[PAPERBACK, HARDCOVER]} newerEdition={null} />);

    expect(screen.getByText("150.000 ₫", { selector: "span.text-3xl" })).toBeVisible();
    await user.click(screen.getByRole("radio", { name: /Bìa cứng/ }));
    expect(screen.getByText("250.000 ₫", { selector: "span.text-3xl" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tăng số lượng" }));
    await user.click(screen.getByRole("button", { name: "Thêm vào giỏ" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Đã thêm 2 cuốn vào giỏ.");
    expect(screen.getByRole("link", { name: "Xem giỏ hàng" })).toHaveAttribute("href", "/gio-hang");
    expect(body).toEqual({ skuId: 101, quantity: 2 });
  });

  it("asks for confirmation before adding an older edition", async () => {
    let posted = false;
    server.use(
      http.get(`${ORIGIN}/api/v1/cart`, () => HttpResponse.json(cart(0))),
      http.post(`${ORIGIN}/api/v1/cart/items`, () => {
        posted = true;
        return HttpResponse.json(cart(1));
      }),
    );
    const user = userEvent.setup();
    renderForm(
      <AddToCartForm
        options={[PAPERBACK]}
        newerEdition={{ name: "Tái bản lần 3 · 2026", href: "/sach/bo-luat-dan-su-2026" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Thêm vào giỏ" }));
    const dialog = screen.getByRole("dialog", { name: "Đã có ấn bản mới" });
    expect(dialog).toBeVisible();
    expect(screen.getByRole("link", { name: "Xem ấn bản mới" })).toHaveAttribute("href", "/sach/bo-luat-dan-su-2026");
    expect(posted).toBe(false);

    await user.click(screen.getByRole("button", { name: "Vẫn thêm ấn bản này" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Đã thêm 1 cuốn vào giỏ.");
    expect(posted).toBe(true);
  });

  it("explains business errors from the backend", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/cart`, () => HttpResponse.json(cart(0))),
      http.post(`${ORIGIN}/api/v1/cart/items`, () =>
        HttpResponse.json(
          { title: "Vượt quá số lượng", status: 422, code: "MAX_QTY_EXCEEDED", traceId: "00-trace" },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderForm(<AddToCartForm options={[PAPERBACK]} newerEdition={null} />);

    await user.click(screen.getByRole("button", { name: "Thêm vào giỏ" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("tối đa 20 cuốn");
    expect(screen.getByRole("button", { name: "Thêm vào giỏ" })).toBeEnabled();
  });

  it("disables buying a cover that is out of stock", () => {
    renderForm(<AddToCartForm options={[{ ...PAPERBACK, inStock: false }]} newerEdition={null} />);
    expect(screen.getByRole("button", { name: "Tạm hết hàng" })).toBeDisabled();
  });

  it("shows the regular price and when a timed promotion ends", () => {
    renderForm(
      <AddToCartForm
        options={[
          {
            ...PAPERBACK,
            listPrice: 250000,
            regularSalePrice: 199000,
            salePrice: 150000,
            discountPercent: 40,
            saleEndsAt: "2026-11-08T00:00:00Z",
          },
        ]}
        newerEdition={null}
      />,
    );
    expect(screen.getByText("150.000 ₫", { selector: "span.text-3xl" })).toBeVisible();
    expect(screen.getByText("-40%")).toBeVisible();
    expect(screen.getByText(/Giá thường 199.000 ₫/)).toBeVisible();
    // 00:00 UTC là 07:00 giờ Việt Nam.
    const saleEnds = screen.getByText(/^Giá ưu đãi đến/);
    expect(saleEnds).toHaveTextContent("08/11/2026");
    expect(saleEnds).toHaveTextContent("07:00");
  });

  it("hides promotion details when the price is the regular one", () => {
    renderForm(
      <AddToCartForm
        options={[{ ...PAPERBACK, listPrice: 395000, salePrice: 395000, regularSalePrice: 395000, discountPercent: 0 }]}
        newerEdition={null}
      />,
    );
    expect(screen.queryByText(/Giá thường/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Giá ưu đãi đến/)).not.toBeInTheDocument();
  });

  it("keeps the quantity between 1 and 20", async () => {
    const user = userEvent.setup();
    renderForm(<AddToCartForm options={[PAPERBACK]} newerEdition={null} />);
    const quantity = screen.getByLabelText("Số lượng");

    expect(screen.getByRole("button", { name: "Giảm số lượng" })).toBeDisabled();
    await user.clear(quantity);
    await user.type(quantity, "50");
    expect(quantity).toHaveValue(20);
    expect(screen.getByRole("button", { name: "Tăng số lượng" })).toBeDisabled();
  });
});
