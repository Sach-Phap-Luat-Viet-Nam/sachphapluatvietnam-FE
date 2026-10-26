import { render, screen, within } from "@testing-library/react";
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

const SKU = {
  skuId: 101,
  skuCode: "SLVN-BLDS-BC",
  bookTitle: "Bộ luật Dân sự 2026",
  editionName: "Tái bản lần 3",
  coverType: "hardcover",
  isbn: "9780306406157",
  isLatestEdition: true,
  available: 35,
};
const SKU_LABEL = "Bộ luật Dân sự 2026 · Tái bản lần 3 · Bìa cứng · SLVN-BLDS-BC";

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

function mockSkuSearch(results: unknown[] = [SKU]) {
  const queries: string[] = [];
  server.use(
    http.get(`${ORIGIN}/api/v1/admin/inventory/sku-search`, ({ request }) => {
      queries.push(new URL(request.url).searchParams.get("Q") ?? "");
      return HttpResponse.json(results);
    }),
  );
  return queries;
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  push.mockReset();
  clearSession();
});
afterAll(() => server.close());

describe("ReceiptCreate", () => {
  it("thủ kho tìm SKU trong một bước rồi lưu phiếu nháp", async () => {
    signIn(["warehouse_keeper"]);
    let body: unknown;
    const queries = mockSkuSearch();
    server.use(
      http.post(`${ORIGIN}/api/v1/admin/inventory/receipts`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(receipt([]), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderCreate();

    await user.type(screen.getByLabelText("SKU"), "Bộ luật");
    const result = await screen.findByRole("button", { name: /Bộ luật Dân sự 2026/ });
    expect(within(result).getByText("Tồn 35")).toBeVisible();
    await user.click(result);
    expect(screen.getByText(SKU_LABEL)).toBeVisible();

    const batch = screen.getByLabelText("Mã lô");
    // Mã lô được gợi ý theo ngày nhập.
    expect(batch).toBeInstanceOf(HTMLInputElement);
    expect((batch as HTMLInputElement).value).toMatch(/^LO-\d{6}$/);
    await user.clear(batch);
    await user.type(batch, "lo-2026-10");
    await user.type(screen.getByLabelText("Số lượng (cuốn)"), "500");
    await user.type(screen.getByLabelText("Giá vốn mỗi cuốn (VNĐ)"), "45000");
    await user.clear(screen.getByLabelText("Ngày nhập"));
    await user.type(screen.getByLabelText("Ngày nhập"), "20102026");
    expect(screen.getByText(/500 cuốn/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Lưu phiếu nhập" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/kho/phieu-nhap/7"));
    expect(queries).toContain("Bộ luật");
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

  it("Enter chọn kết quả đầu tiên, gợi ý mã lô rồi chuyển con trỏ sang ô Mã lô", async () => {
    signIn(["super_admin"]);
    mockSkuSearch();
    const user = userEvent.setup();
    renderCreate();

    await user.type(screen.getByLabelText("SKU"), "SLVN-BLDS-BC{Enter}");

    expect(await screen.findByText(SKU_LABEL)).toBeVisible();
    expect(screen.getByLabelText("Mã lô")).toHaveFocus();
    expect(push).not.toHaveBeenCalled();
  });

  it("không có SKU phù hợp thì nhắc thêm sách ở phần Sách", async () => {
    signIn(["super_admin"]);
    mockSkuSearch([]);
    const user = userEvent.setup();
    renderCreate();

    await user.type(screen.getByLabelText("SKU"), "không có");

    expect(await screen.findByText(/Không có SKU phù hợp/)).toBeVisible();
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

  it("thêm dòng mới giữ xưởng in và ngày nhập của dòng trước, con trỏ vào ô tìm SKU", async () => {
    signIn(["super_admin"]);
    const user = userEvent.setup();
    renderCreate();

    await user.type(screen.getByLabelText("Xưởng in", { exact: false }), "Xưởng in A");
    await user.click(screen.getByRole("button", { name: "Thêm dòng" }));

    const printers = screen.getAllByLabelText("Xưởng in", { exact: false });
    expect(printers[1]).toHaveValue("Xưởng in A");
    expect(screen.getAllByLabelText("SKU")[1]).toHaveFocus();
  });

  it("nhân bản dòng giữ SKU, xưởng in, giá vốn nhưng để trống mã lô và số lượng", async () => {
    signIn(["super_admin"]);
    mockSkuSearch();
    const user = userEvent.setup();
    renderCreate();
    await user.type(screen.getByLabelText("SKU"), "SLVN-BLDS-BC{Enter}");
    await screen.findByText(SKU_LABEL);
    await user.type(screen.getByLabelText("Giá vốn mỗi cuốn (VNĐ)"), "45000");
    await user.type(screen.getByLabelText("Số lượng (cuốn)"), "500");

    await user.click(screen.getByRole("button", { name: "Nhân bản dòng 1" }));

    expect(screen.getByRole("heading", { name: "Dòng 2" })).toBeVisible();
    expect(screen.getAllByText(SKU_LABEL)).toHaveLength(2);
    const [, secondBatch] = screen.getAllByLabelText("Mã lô");
    const [, secondQuantity] = screen.getAllByLabelText("Số lượng (cuốn)");
    const [, secondCost] = screen.getAllByLabelText("Giá vốn mỗi cuốn (VNĐ)");
    expect(secondBatch).toHaveValue("");
    expect(secondBatch).toHaveFocus();
    expect(secondQuantity).toHaveValue("");
    expect(secondCost).toHaveValue("45000");
  });

  it("bấm nút gợi ý để điền nhanh mã lô theo ngày nhập", async () => {
    signIn(["super_admin"]);
    const user = userEvent.setup();
    renderCreate();

    const monthly = screen.getByRole("button", { name: /^Điền mã lô LO-\d{4}-\d{2}$/ });
    await user.click(monthly);

    expect(screen.getByLabelText("Mã lô")).toHaveValue(monthly.textContent);
    await user.click(screen.getByRole("button", { name: /^Điền mã lô LO-\d{6}$/ }));
    expect((screen.getByLabelText("Mã lô") as HTMLInputElement).value).toMatch(/^LO-\d{6}$/);
  });

  it("backend chưa có API tìm SKU (404) thì báo rõ thay vì câu chung chung", async () => {
    signIn(["super_admin"]);
    server.use(
      http.get(`${ORIGIN}/api/v1/admin/inventory/sku-search`, () =>
        HttpResponse.json({ title: "Không tìm thấy", status: 404, code: "NOT_FOUND" }, { status: 404 }),
      ),
    );
    const user = userEvent.setup();
    renderCreate();

    await user.type(screen.getByLabelText("SKU"), "pl250");

    expect(await screen.findByRole("alert")).toHaveTextContent("Máy chủ chưa có chức năng tìm SKU");
  });
});
