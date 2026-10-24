import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { QuickAddButton } from "./QuickAddButton";

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

describe("QuickAddButton", () => {
  it("adds one copy of the cheapest in-stock cover", async () => {
    let body: unknown;
    server.use(
      http.get(`${ORIGIN}/api/v1/books/${SLUG}`, () =>
        HttpResponse.json(
          detail([
            { id: 101, coverType: "hardcover", salePrice: 250000, inStock: true },
            { id: 100, coverType: "paperback", salePrice: 150000, inStock: true },
          ]),
        ),
      ),
      http.post(`${ORIGIN}/api/v1/cart/items`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ items: [], totalQuantity: 1, subtotal: 150000 });
      }),
    );
    const user = userEvent.setup();
    renderButton(<QuickAddButton slug={SLUG} title="Bộ luật Dân sự 2026" />);

    await user.click(screen.getByRole("button", { name: "Thêm Bộ luật Dân sự 2026 vào giỏ" }));

    expect(await screen.findByText(/Đã thêm 1 cuốn \(bìa mềm\) vào giỏ/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Xem giỏ" })).toHaveAttribute("href", "/gio-hang");
    expect(body).toEqual({ skuId: 100, quantity: 1 });
  });

  it("opens the book page when no cover can be bought anymore", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/books/${SLUG}`, () =>
        HttpResponse.json(detail([{ id: 100, coverType: "paperback", salePrice: 150000, inStock: false }])),
      ),
    );
    const user = userEvent.setup();
    renderButton(<QuickAddButton slug={SLUG} title="Bộ luật Dân sự 2026" variant="full" />);

    await user.click(screen.getByRole("button", { name: "Thêm vào giỏ" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith(`/sach/${SLUG}`));
  });

  it("explains backend errors", async () => {
    server.use(
      http.get(`${ORIGIN}/api/v1/books/${SLUG}`, () =>
        HttpResponse.json(detail([{ id: 100, coverType: "paperback", salePrice: 150000, inStock: true }])),
      ),
      http.post(`${ORIGIN}/api/v1/cart/items`, () =>
        HttpResponse.json({ title: "Hết hàng", status: 409, code: "OUT_OF_STOCK" }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderButton(<QuickAddButton slug={SLUG} title="Bộ luật Dân sự 2026" variant="full" />);

    await user.click(screen.getByRole("button", { name: "Thêm vào giỏ" }));

    expect(await screen.findByText(/không còn đủ số lượng/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Thêm vào giỏ" })).toBeEnabled();
  });
});
