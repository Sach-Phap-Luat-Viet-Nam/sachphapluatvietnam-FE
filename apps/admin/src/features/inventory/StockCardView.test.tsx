import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { StockCardView } from "./StockCardView";

const ORIGIN = window.location.origin;
const server = setupServer();

function card(overrides: Record<string, unknown> = {}) {
  return {
    skuId: 100,
    skuCode: "SLVN-BLDS-BM",
    bookTitle: "Bộ luật Dân sự 2026",
    editionName: "Tái bản lần 3",
    coverType: "paperback",
    available: 45,
    reserved: 5,
    onHand: 50,
    lowStockThreshold: 50,
    batches: [
      {
        id: 21,
        batchCode: "LO-2026-10",
        printerName: "Xưởng in A",
        quantity: 500,
        remaining: 50,
        unitCost: 45000,
        receivedAt: "2026-10-20",
      },
    ],
    recentTransactions: [
      {
        id: 32,
        type: "sale",
        quantity: -450,
        printBatchId: 21,
        reference: "SLVN2610230001",
        createdBy: 2,
        createdByName: "Thủ kho Hoa",
        note: null,
        createdAt: "2026-10-23T05:00:00Z",
      },
      {
        id: 31,
        type: "import",
        quantity: 500,
        printBatchId: 21,
        reference: "GR-7",
        createdBy: 1,
        createdByName: null,
        note: null,
        createdAt: "2026-10-23T04:00:00Z",
      },
    ],
    ...overrides,
  };
}

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <StockCardView skuId={100} />
    </QueryClientProvider>,
  );
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: {
      id: 4,
      email: "kho@sachluat.vn",
      fullName: "Thủ kho",
      roles: ["warehouse_keeper"],
      requiresTwoFactorSetup: false,
    },
  });
  server.use(http.get(`${ORIGIN}/api/v1/admin/inventory/skus/100`, () => HttpResponse.json(card())));
});
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

describe("StockCardView", () => {
  it("hiện tồn, cảnh báo tồn thấp và chứng từ", async () => {
    renderCard();

    expect(await screen.findByRole("heading", { name: "Thẻ kho: Bộ luật Dân sự 2026" })).toBeVisible();
    expect(screen.getByText("Tái bản lần 3 · Bìa mềm · SLVN-BLDS-BM")).toBeVisible();
    expect(screen.getByText("Tồn thấp")).toBeVisible();
    // Người thao tác hiện tên; giao dịch chưa có tên thì hiện "Tài khoản #id".
    expect(screen.getByText("Thủ kho Hoa")).toBeVisible();
    expect(screen.getByText("Tài khoản #1")).toBeVisible();
    expect(screen.getByRole("link", { name: "GR-7" })).toHaveAttribute("href", "/kho/phieu-nhap/7");
    // Thủ kho không vào được phần Đơn hàng nên mã đơn không có link.
    expect(screen.queryByRole("link", { name: "SLVN2610230001" })).not.toBeInTheDocument();
    expect(screen.getByText("-450")).toBeVisible();
    expect(screen.getByText("+500")).toBeVisible();
  });

  it("lưu ngưỡng tồn thấp", async () => {
    let body: unknown;
    server.use(
      http.put(`${ORIGIN}/api/v1/admin/inventory/skus/100/threshold`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(card({ lowStockThreshold: 20 }));
      }),
    );
    const user = userEvent.setup();
    renderCard();

    const input = await screen.findByLabelText("Cảnh báo khi tồn khả dụng còn (cuốn)");
    await user.clear(input);
    await user.type(input, "20");
    await user.click(screen.getByRole("button", { name: "Lưu ngưỡng" }));

    expect(await screen.findByText("Đã lưu ngưỡng tồn thấp.")).toBeVisible();
    expect(body).toEqual({ lowStockThreshold: 20 });
    expect(screen.queryByText("Tồn thấp")).not.toBeInTheDocument();
  });

  it("xuất biếu tặng và báo lỗi khi vượt tồn", async () => {
    let body: unknown;
    let calls = 0;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/inventory/issues`, async ({ request }) => {
        calls += 1;
        body = await request.json();
        return calls === 1
          ? HttpResponse.json({ title: "x", status: 409, code: "OUT_OF_STOCK" }, { status: 409 })
          : HttpResponse.json(card({ available: 42, onHand: 47 }));
      }),
    );
    const user = userEvent.setup();
    renderCard();

    const form = within(
      (await screen.findByRole("heading", { name: "Xuất thủ công" })).closest("section") as HTMLElement,
    );
    await user.selectOptions(form.getByLabelText("Loại xuất"), "gift");
    await user.type(form.getByLabelText("Số lượng (cuốn)"), "300");
    await user.type(form.getByLabelText("Lý do"), "Biếu thư viện");
    await user.click(form.getByRole("button", { name: "Xuất kho" }));
    expect(await form.findByText("Không đủ tồn khả dụng cho số lượng này.")).toBeVisible();

    await user.clear(form.getByLabelText("Số lượng (cuốn)"));
    await user.type(form.getByLabelText("Số lượng (cuốn)"), "3");
    await user.click(form.getByRole("button", { name: "Xuất kho" }));

    expect(await form.findByText("Đã xuất 3 cuốn (Biếu tặng).")).toBeVisible();
    expect(body).toEqual({ skuId: 100, quantity: 3, type: "gift", note: "Biếu thư viện" });
    expect(screen.getByText("42")).toBeVisible();
  });
});
