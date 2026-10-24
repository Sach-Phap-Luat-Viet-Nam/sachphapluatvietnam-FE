import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { ReceiptDetail } from "./ReceiptDetail";

const ORIGIN = window.location.origin;
const server = setupServer();

const LINE = {
  id: 11,
  skuId: 100,
  skuCode: "SLVN-BLDS-BM",
  batchCode: "LO-2026-10",
  printerName: "Xưởng in A",
  quantity: 500,
  unitCost: 45000,
  receivedAt: "2026-10-20",
  printBatchId: null,
};

function receipt(status = "draft", extra: Record<string, unknown> = {}) {
  return {
    id: 7,
    status,
    note: "Nhập lô tháng 10",
    createdBy: 4,
    createdAt: "2026-10-23T03:00:00Z",
    decidedBy: null,
    decidedAt: null,
    rejectReason: null,
    lines: [LINE],
    ...extra,
  };
}

function signIn(id: number, roles: string[]) {
  startSession({
    accessToken: "t1",
    expiresIn: 900,
    user: { id, email: "nv@sachluat.vn", fullName: "Nhân viên", roles, requiresTwoFactorSetup: false },
  });
}

function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ReceiptDetail receiptId={7} />
    </QueryClientProvider>,
  );
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() =>
  server.use(http.get(`${ORIGIN}/api/v1/admin/inventory/receipts/7`, () => HttpResponse.json(receipt()))),
);
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

describe("ReceiptDetail", () => {
  it("hiện các lô và tổng tiền", async () => {
    signIn(4, ["warehouse_keeper"]);
    renderDetail();

    expect(await screen.findByRole("heading", { name: "Phiếu nhập #7" })).toBeVisible();
    expect(screen.getByRole("link", { name: "SLVN-BLDS-BM" })).toHaveAttribute("href", "/kho/the-kho/100");
    expect(screen.getAllByText("22.500.000 ₫")).toHaveLength(2);
    expect(screen.getByText(/Phiếu đang chờ Super Admin duyệt/)).toBeVisible();
    expect(screen.queryByRole("button", { name: /Duyệt/ })).not.toBeInTheDocument();
  });

  it("Super Admin duyệt sau khi xác nhận", async () => {
    signIn(1, ["super_admin"]);
    const approve = vi.fn(() =>
      HttpResponse.json(receipt("approved", { decidedBy: 1, decidedAt: "2026-10-24T04:00:00Z" })),
    );
    server.use(http.post(`${ORIGIN}/api/v1/admin/inventory/receipts/7/approve`, approve));
    const user = userEvent.setup();
    renderDetail();

    expect(await screen.findByText(/cộng 500 cuốn vào tồn khả dụng/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Duyệt và nhập kho" }));
    await user.click(screen.getByRole("button", { name: "Duyệt" }));

    expect(await screen.findByText("Đã duyệt")).toBeVisible();
    expect(approve).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Tài khoản #1")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Từ chối/ })).not.toBeInTheDocument();
  });

  it("người lập phiếu không thấy nút duyệt nhưng vẫn từ chối được kèm lý do", async () => {
    signIn(4, ["super_admin"]);
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/inventory/receipts/7/reject`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(receipt("rejected", { decidedBy: 4, rejectReason: "Sai số lượng" }));
      }),
    );
    const user = userEvent.setup();
    renderDetail();

    expect(await screen.findByText(/cần một Super Admin khác duyệt/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Duyệt và nhập kho" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Từ chối" }));
    await user.click(screen.getByRole("button", { name: "Từ chối phiếu" }));
    expect(await screen.findByText("Anh/chị nhập thông tin này.")).toBeVisible();

    await user.type(screen.getByLabelText("Lý do từ chối"), " Sai số lượng ");
    await user.click(screen.getByRole("button", { name: "Từ chối phiếu" }));

    expect(await screen.findByText("Sai số lượng")).toBeVisible();
    expect(body).toEqual({ reason: "Sai số lượng" });
  });

  it("phiếu đã được người khác xử lý thì báo và tải lại", async () => {
    signIn(1, ["super_admin"]);
    let loads = 0;
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/inventory/receipts/7`, () => {
        loads += 1;
        return HttpResponse.json(loads === 1 ? receipt() : receipt("approved", { decidedBy: 2 }));
      }),
      http.post(`${ORIGIN}/api/v1/admin/inventory/receipts/7/approve`, () =>
        HttpResponse.json({ title: "x", status: 409, code: "RECEIPT_NOT_DRAFT" }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderDetail();

    await user.click(await screen.findByRole("button", { name: "Duyệt và nhập kho" }));
    await user.click(screen.getByRole("button", { name: "Duyệt" }));

    expect(await screen.findByText("Đã duyệt")).toBeVisible();
    expect(loads).toBe(2);
  });
});
