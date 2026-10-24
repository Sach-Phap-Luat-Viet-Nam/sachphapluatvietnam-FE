import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { QuickBuyButton } from "./QuickBuyButton";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const ORIGIN = window.location.origin;
const SLUG = "bo-luat-dan-su-2026";
const server = setupServer();

function detail(skus: Array<{ id: number; coverType: string; salePrice: number; inStock: boolean }>) {
  return { editions: [{ isLatest: true, status: "on_sale", skus }] };
}

function renderButton(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  push.mockReset();
});
afterAll(() => server.close());

describe("QuickBuyButton", () => {
  it("goes straight to checkout with one copy of the cheapest in-stock cover, without touching the cart", async () => {
    let cartTouched = false;
    server.use(
      http.get(`${ORIGIN}/api/v1/books/${SLUG}`, () =>
        HttpResponse.json(
          detail([
            { id: 101, coverType: "hardcover", salePrice: 250000, inStock: true },
            { id: 100, coverType: "paperback", salePrice: 150000, inStock: true },
          ]),
        ),
      ),
      http.all(`${ORIGIN}/api/v1/cart*`, () => {
        cartTouched = true;
        return HttpResponse.json({ items: [], totalQuantity: 0, subtotal: 0 });
      }),
    );
    const user = userEvent.setup();
    renderButton(<QuickBuyButton slug={SLUG} title="Bộ luật Dân sự 2026" />);

    await user.click(screen.getByRole("button", { name: "Mua ngay Bộ luật Dân sự 2026" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith(`/thanh-toan?mua-ngay=${SLUG}&sku=100&sl=1`));
    expect(cartTouched).toBe(false);
  });

  it("opens the book page when no cover can be bought anymore", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/books/${SLUG}`, () =>
        HttpResponse.json(detail([{ id: 100, coverType: "paperback", salePrice: 150000, inStock: false }])),
      ),
    );
    const user = userEvent.setup();
    renderButton(<QuickBuyButton slug={SLUG} title="Bộ luật Dân sự 2026" variant="full" />);

    await user.click(screen.getByRole("button", { name: "Mua ngay" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith(`/sach/${SLUG}`));
  });

  it("explains when the book cannot be loaded and lets the customer retry", async () => {
    server.use(http.get(`${ORIGIN}/api/v1/books/${SLUG}`, () => HttpResponse.error()));
    const user = userEvent.setup();
    renderButton(<QuickBuyButton slug={SLUG} title="Bộ luật Dân sự 2026" />);

    await user.click(screen.getByRole("button", { name: "Mua ngay Bộ luật Dân sự 2026" }));

    expect(await screen.findByText(/Không kết nối được máy chủ/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Mua ngay Bộ luật Dân sự 2026" })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });
});
