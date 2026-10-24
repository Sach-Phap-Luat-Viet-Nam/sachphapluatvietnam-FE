import { render, screen, within } from "@testing-library/react";
import { OrderDetails } from "./OrderDetails";
import { orderSchema } from "./schemas";

function order(overrides: Record<string, unknown> = {}) {
  return orderSchema.parse({
    orderCode: "SLVN2610230001",
    status: "pending_confirm",
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    customerName: "Nguyễn Văn A",
    phone: "0901234567",
    email: null,
    shippingAddress: { province: "Hà Nội", ward: "Phường Cầu Giấy", streetAddress: "1 Xuân Thủy" },
    items: [
      {
        skuId: 100,
        skuCode: "SLVN-BLDS-2026-BM",
        bookTitle: "Bộ luật Dân sự 2026",
        editionName: null,
        isbn: "9780306406157",
        coverType: "paperback",
        unitPrice: 150000,
        quantity: 2,
        lineTotal: 300000,
      },
    ],
    subtotal: 300000,
    discount: 0,
    shippingFee: 0,
    total: 300000,
    invoiceRequired: false,
    invoiceInfo: null,
    note: null,
    paymentExpiresAt: null,
    canCancel: true,
    createdAt: "2026-10-23T03:00:00Z",
    history: [],
    ...overrides,
  });
}

describe("OrderDetails", () => {
  it("shows no discount rows for an order without promotions", () => {
    render(<OrderDetails order={order()} />);
    expect(screen.queryByText("Giảm giá")).not.toBeInTheDocument();
    expect(screen.queryByText("Giảm phí ship")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Ưu đãi đã áp" })).not.toBeInTheDocument();
  });

  it("shows discounts, shipping discount and applied promotions from the order", () => {
    render(
      <OrderDetails
        order={order({
          discount: 30000,
          shippingFee: 30000,
          shippingDiscount: 30000,
          total: 270000,
          items: [
            {
              skuId: 100,
              skuCode: "SLVN-BLDS-2026-BM",
              bookTitle: "Bộ luật Dân sự 2026",
              editionName: null,
              isbn: "9780306406157",
              coverType: "paperback",
              unitPrice: 150000,
              quantity: 2,
              lineTotal: 300000,
              discountAmount: 30000,
            },
          ],
          appliedPromotions: [
            { promotionId: 7, name: "Giảm 10% đơn đầu", kind: "order_discount", couponCode: "GIAM10", amount: 30000 },
          ],
        })}
      />,
    );
    expect(screen.getByText("Giảm phí ship")).toBeVisible();
    const offers = screen.getByRole("list", { name: "Ưu đãi đã áp" });
    expect(within(offers).getByText("Giảm 10% đơn đầu (mã GIAM10)")).toBeVisible();
    expect(screen.getByText("270.000 ₫")).toBeVisible();
  });
});
