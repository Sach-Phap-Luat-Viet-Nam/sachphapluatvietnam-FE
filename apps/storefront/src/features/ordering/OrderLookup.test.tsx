import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { OrderLookup } from "./OrderLookup";

const ORIGIN = window.location.origin;
const server = setupServer();

const ORDER = {
  orderCode: "SLVN2610230001",
  status: "shipping",
  paymentMethod: "cod",
  paymentStatus: "unpaid",
  customerName: "Nguyễn Văn A",
  phone: "0901234567",
  email: "a@example.com",
  shippingAddress: { province: "Hà Nội", ward: "Phường Cầu Giấy", streetAddress: "1 Xuân Thủy" },
  items: [
    {
      skuId: 100,
      skuCode: "SLVN-BLDS-2026-BM",
      bookTitle: "Bộ luật Dân sự 2026",
      editionName: "Tái bản lần 3",
      isbn: "9780306406157",
      coverType: "hardcover",
      unitPrice: 150000,
      quantity: 1,
      lineTotal: 150000,
    },
  ],
  subtotal: 150000,
  discount: 0,
  shippingFee: 30000,
  total: 180000,
  invoiceRequired: false,
  invoiceInfo: null,
  note: null,
  paymentExpiresAt: null,
  canCancel: false,
  createdAt: "2026-10-23T03:00:00Z",
  history: [
    { fromStatus: null, toStatus: "pending_confirm", note: null, createdAt: "2026-10-23T03:00:00Z" },
    {
      fromStatus: "packing",
      toStatus: "shipping",
      note: "Đã giao cho đơn vị vận chuyển",
      createdAt: "2026-10-24T02:00:00Z",
    },
  ],
};

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("OrderLookup", () => {
  it("looks up an order by code and phone and shows its timeline", async () => {
    let body: unknown;
    server.use(
      http.post(`${ORIGIN}/api/v1/orders/lookup`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(ORDER);
      }),
    );
    const user = userEvent.setup();
    render(<OrderLookup defaultOrderCode="slvn2610230001" />);

    await user.type(screen.getByLabelText("Số điện thoại đặt hàng"), "0901 234 567");
    await user.click(screen.getByRole("button", { name: "Tra cứu" }));

    expect(await screen.findByRole("heading", { name: "Đơn hàng SLVN2610230001" })).toBeVisible();
    expect(screen.getByText("Đang giao", { selector: "dd" })).toBeVisible();
    expect(screen.getByText("Tái bản lần 3 · Bìa cứng · ISBN 9780306406157")).toBeVisible();
    expect(screen.getByText("180.000 ₫")).toBeVisible();
    expect(screen.getByText(/Đã giao cho đơn vị vận chuyển/)).toBeVisible();
    expect(body).toEqual({ orderCode: "SLVN2610230001", phone: "0901234567" });
  });

  it("explains when no order matches", async () => {
    server.use(
      http.post(`${ORIGIN}/api/v1/orders/lookup`, () =>
        HttpResponse.json({ title: "Not found", status: 404, code: "NOT_FOUND" }, { status: 404 }),
      ),
    );
    const user = userEvent.setup();
    render(<OrderLookup />);

    await user.type(screen.getByLabelText("Mã đơn hàng"), "SLVN2610230009");
    await user.type(screen.getByLabelText("Số điện thoại đặt hàng"), "0901234567");
    await user.click(screen.getByRole("button", { name: "Tra cứu" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Không tìm thấy đơn hàng.");
  });

  it("validates the phone before calling the backend", async () => {
    const user = userEvent.setup();
    render(<OrderLookup defaultOrderCode="SLVN2610230001" />);
    await user.type(screen.getByLabelText("Số điện thoại đặt hàng"), "12345");
    await user.click(screen.getByRole("button", { name: "Tra cứu" }));
    expect(await screen.findByText("Số điện thoại gồm 10 số, bắt đầu bằng 0 (hoặc +84).")).toBeVisible();
  });
});
