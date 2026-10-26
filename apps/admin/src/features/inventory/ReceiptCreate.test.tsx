import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { ReceiptCreate } from "./ReceiptCreate";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const ORIGIN = window.location.origin;
const server = setupServer();

const BOOK = {
  id: 5,
  title: "Bộ luật Dân sự 2026",
  editions: [
    {
      id: 10,
      editionName: "Tái bản lần 3",
      isLatest: true,
      status: "on_sale",
      skus: [
        { id: 100, skuCode: "SLVN-BLDS-BM", coverType: "paperback" },
        { id: 101, skuCode: "SLVN-BLDS-BC", coverType: "hardcover" },
      ],
    },
  ],
};

function receipt(lines: unknown[]) {
  return {
    id: 7,
    status: "draft",
    note: null,
    createdBy: 4,
    createdAt: "2026-10-24T03:00:00Z",
    decidedBy: null,
    decidedAt: null,
    rejectReason: null,
    lines,
  };
}

function renderCreate() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ReceiptCreate />
    </QueryClientProvider>,
  );
}

function signIn(roles: string[]) {
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: { id: 4, email: "kho@sachluat.vn", fullName: "Thủ kho", roles, requiresTwoFactorSetup: false },
  });
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  push.mockReset();
  clearSession();
});
afterAll(() => server.close());

describe("ReceiptCreate", () => {
  it("tìm sách, chọn SKU rồi lưu phiếu nháp", async () => {
    signIn(["super_admin"]);
    let body: unknown;
    let search: string | null = null;
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/books`, ({ request }) => {
        search = new URL(request.url).searchParams.get("Q");
        return HttpResponse.json({
          items: [{ id: 5, title: BOOK.title, slug: "bo-luat-dan-su-2026", bookType: "code" }],
          meta: { page: 1, limit: 8, total: 1 },
        });
      }),
      http.get(`${ORIGIN}/api/v1/admin/books/5`, () => HttpResponse.json(BOOK)),
      http.post(`${ORIGIN}/api/v1/admin/inventory/receipts`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(receipt([]), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderCreate();

    await user.type(screen.getByLabelText("SKU"), "Bộ luật");
    await user.click(await screen.findByRole("button", { name: /Bộ luật Dân sự 2026/ }));
    await user.click(await screen.findByRole("button", { name: /SLVN-BLDS-BC · Bìa cứng/ }));
    expect(screen.getByText("Bộ luật Dân sự 2026 · Tái bản lần 3 · Bìa cứng · SLVN-BLDS-BC")).toBeVisible();

    await user.type(screen.getByLabelText("Mã lô"), "lo-2026-10");
    await user.type(screen.getByLabelText("Số lượng (cuốn)"), "500");
    await user.type(screen.getByLabelText("Giá vốn mỗi cuốn (VNĐ)"), "45000");
    await user.clear(screen.getByLabelText("Ngày nhập"));
    await user.type(screen.getByLabelText("Ngày nhập"), "20102026");
    expect(screen.getByText(/500 cuốn/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Lưu phiếu nhập" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/kho/phieu-nhap/7"));
    expect(search).toBe("Bộ luật");
    expect(body).toEqual({
      note: null,
      lines: [
        {
          skuId: 101,
          batchCode: "LO-2026-10",
          printerName: null,
          quantity: 500,
          unitCost: 45000,
          receivedAt: "2026-10-20",
        },
      ],
    });
  });

  it("đầu sách chỉ có một SKU thì tự chọn SKU và chuyển sang ô Mã lô", async () => {
    signIn(["super_admin"]);
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/books`, () =>
        HttpResponse.json({
          items: [{ id: 5, title: BOOK.title, slug: "bo-luat-dan-su-2026", bookType: "code" }],
          meta: { page: 1, limit: 8, total: 1 },
        }),
      ),
      http.get(`${ORIGIN}/api/v1/admin/books/5`, () =>
        HttpResponse.json({
          ...BOOK,
          editions: BOOK.editions.map((edition) => ({ ...edition, skus: edition.skus.slice(0, 1) })),
        }),
      ),
    );
    const user = userEvent.setup();
    renderCreate();

    await user.type(screen.getByLabelText("SKU"), "Bộ luật");
    await user.click(await screen.findByRole("button", { name: /Bộ luật Dân sự 2026/ }));

    expect(await screen.findByText("Bộ luật Dân sự 2026 · Tái bản lần 3 · Bìa mềm · SLVN-BLDS-BM")).toBeVisible();
    expect(screen.getByLabelText("Mã lô")).toHaveFocus();
  });

  it("chưa chọn SKU thì báo lỗi, không gọi API", async () => {
    signIn(["super_admin"]);
    const create = vi.fn(() => HttpResponse.json(receipt([])));
    server.use(http.post(`${ORIGIN}/api/v1/admin/inventory/receipts`, create));
    const user = userEvent.setup();
    renderCreate();

    await user.click(screen.getByRole("button", { name: "Thêm dòng" }));
    expect(screen.getByRole("heading", { name: "Dòng 2" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Xóa dòng 2" }));
    await user.click(screen.getByRole("button", { name: "Lưu phiếu nhập" }));

    expect(await screen.findByText("Anh/chị chọn SKU.")).toBeVisible();
    expect(create).not.toHaveBeenCalled();
  });

  it("vai trò không xem được Catalog thì nói rõ lý do không tìm được SKU", async () => {
    signIn(["warehouse_keeper"]);
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/books`, () =>
        HttpResponse.json({ title: "Forbidden", status: 403, code: "FORBIDDEN" }, { status: 403 }),
      ),
    );
    const user = userEvent.setup();
    renderCreate();

    await user.type(screen.getByLabelText("SKU"), "Bộ luật");

    expect(await screen.findByRole("alert")).toHaveTextContent("chưa được xem danh sách sách");
  });
});
