import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { clearSession, startSession } from "@slvn/auth";
import { ReceiptEdit } from "./ReceiptEdit";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const ORIGIN = window.location.origin;
const server = setupServer();

function receipt(status = "draft") {
  return {
    id: 7,
    status,
    note: "Nhập lô tháng 10",
    createdBy: 4,
    createdAt: "2026-10-23T03:00:00Z",
    decidedBy: null,
    decidedAt: null,
    rejectReason: null,
    lines: [
      {
        id: 11,
        skuId: 100,
        skuCode: "SLVN-BLDS-BM",
        bookTitle: "Bộ luật Dân sự 2026",
        editionName: "Tái bản lần 3",
        coverType: "paperback",
        batchCode: "LO-2026-10",
        printerName: "Xưởng in A",
        quantity: 500,
        unitCost: 45000,
        receivedAt: "2026-10-20",
        printBatchId: null,
      },
    ],
  };
}

function renderEdit() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ReceiptEdit receiptId={7} />
    </QueryClientProvider>,
  );
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() =>
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
  }),
);
afterEach(() => {
  server.resetHandlers();
  push.mockReset();
  clearSession();
});
afterAll(() => server.close());

describe("ReceiptEdit", () => {
  it("điền sẵn phiếu nháp và lưu thay đổi bằng PUT", async () => {
    let body: unknown;
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/inventory/receipts/7`, () => HttpResponse.json(receipt())),
      http.put(`${ORIGIN}/api/v1/admin/inventory/receipts/7`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(receipt());
      }),
    );
    const user = userEvent.setup();
    renderEdit();

    expect(await screen.findByRole("heading", { name: "Sửa phiếu nhập #7" })).toBeVisible();
    expect(screen.getByText("Bộ luật Dân sự 2026 · Tái bản lần 3 · Bìa mềm · SLVN-BLDS-BM")).toBeVisible();
    expect(screen.getByLabelText("Mã lô")).toHaveValue("LO-2026-10");
    expect(screen.getByLabelText("Ghi chú", { exact: false })).toHaveValue("Nhập lô tháng 10");

    await user.clear(screen.getByLabelText("Số lượng (cuốn)"));
    await user.type(screen.getByLabelText("Số lượng (cuốn)"), "480");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/kho/phieu-nhap/7"));
    expect(body).toEqual({
      note: "Nhập lô tháng 10",
      lines: [
        {
          skuId: 100,
          batchCode: "LO-2026-10",
          printerName: "Xưởng in A",
          quantity: 480,
          unitCost: 45000,
          receivedAt: "2026-10-20",
        },
      ],
    });
  });

  it("phiếu đã duyệt thì không cho sửa", async () => {
    server.use(http.get(`${ORIGIN}/api/v1/admin/inventory/receipts/7`, () => HttpResponse.json(receipt("approved"))));
    renderEdit();

    expect(await screen.findByRole("alert")).toHaveTextContent("không sửa được");
    expect(screen.queryByRole("button", { name: "Lưu thay đổi" })).not.toBeInTheDocument();
  });
});
