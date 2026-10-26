import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { BuyComboButton } from "./BuyComboButton";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const ORIGIN = window.location.origin;
const server = setupServer();

// Bộ "sách AB": một cuốn tập 1 và hai cuốn tập 2.
const LINES = [
  { skuId: 11, quantity: 1 },
  { skuId: 12, quantity: 2 },
];
const CART = { items: [], totalQuantity: 3, subtotal: 150000 };

function renderButton(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** Ghi lại body mỗi lần thêm giỏ; `failOn` là số thứ tự (từ 1) của lần gọi trả OUT_OF_STOCK. */
function mockCart(bodies: unknown[], failOn?: number) {
  server.use(
    http.post(`${ORIGIN}/api/v1/cart/items`, async ({ request }) => {
      bodies.push(await request.json());
      return bodies.length === failOn
        ? HttpResponse.json({ title: "Hết hàng", status: 409, code: "OUT_OF_STOCK" }, { status: 409 })
        : HttpResponse.json(CART);
    }),
  );
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  push.mockReset();
});
afterAll(() => server.close());

describe("BuyComboButton", () => {
  it("thêm đủ từng sách của bộ vào giỏ theo thứ tự rồi mời xem giỏ", async () => {
    const bodies: unknown[] = [];
    mockCart(bodies);
    const user = userEvent.setup();
    renderButton(<BuyComboButton lines={LINES} isSellable />);

    await user.click(screen.getByRole("button", { name: "Thêm combo vào giỏ" }));

    expect(await screen.findByText(/Đã thêm combo \(3 cuốn\) vào giỏ/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Xem giỏ hàng" })).toHaveAttribute("href", "/gio-hang");
    expect(bodies).toEqual([
      { skuId: 11, quantity: 1 },
      { skuId: 12, quantity: 2 },
    ]);
    expect(push).not.toHaveBeenCalled();
  });

  it("Mua ngay thêm cả bộ rồi chuyển sang thanh toán", async () => {
    const bodies: unknown[] = [];
    mockCart(bodies);
    const user = userEvent.setup();
    renderButton(<BuyComboButton lines={LINES} isSellable />);

    await user.click(screen.getByRole("button", { name: "Mua ngay" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/thanh-toan"));
    expect(bodies).toHaveLength(2);
  });

  it("một sách hết hàng giữa chừng thì dừng, báo lỗi và số sách đã vào giỏ, không chuyển trang", async () => {
    const bodies: unknown[] = [];
    mockCart(bodies, 2);
    const user = userEvent.setup();
    renderButton(<BuyComboButton lines={LINES} isSellable />);

    await user.click(screen.getByRole("button", { name: "Mua ngay" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/không còn đủ số lượng/);
    expect(alert).toHaveTextContent("Đã có 1 sách của combo trong giỏ");
    expect(screen.getByRole("link", { name: "bạn kiểm tra lại giỏ hàng" })).toHaveAttribute("href", "/gio-hang");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Thêm combo vào giỏ" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Mua ngay" })).toBeEnabled();
  });

  it("sách đầu tiên đã lỗi thì không nhắc giỏ đang có sách của combo", async () => {
    const bodies: unknown[] = [];
    mockCart(bodies, 1);
    const user = userEvent.setup();
    renderButton(<BuyComboButton lines={LINES} isSellable />);

    await user.click(screen.getByRole("button", { name: "Thêm combo vào giỏ" }));

    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("trong giỏ,");
    expect(bodies).toHaveLength(1);
  });

  it("combo có sách ngừng bán thì không có nút mua", () => {
    renderButton(<BuyComboButton lines={LINES} isSellable={false} />);

    expect(screen.getByText("Combo tạm ngừng bán")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
