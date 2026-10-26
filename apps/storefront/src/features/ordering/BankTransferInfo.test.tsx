import { render, screen } from "@testing-library/react";
import { BankTransferInfo } from "./BankTransferInfo";
import { orderSchema } from "./schemas";

const INSTRUCTIONS = {
  bankName: "MBBank",
  accountNumber: "0123456789",
  accountName: "CONG TY SACH LUAT",
  amount: 480000,
  transferContent: "SLVN2610230001",
  qrUrl: "https://qr.sepay.vn/img?acc=0123456789&bank=MBBank&amount=480000&des=SLVN2610230001",
};

function order(paymentInstructions: unknown) {
  return orderSchema.parse({
    orderCode: "SLVN2610230001",
    status: "pending_payment",
    paymentMethod: "bank_transfer",
    paymentStatus: "unpaid",
    customerName: "Nguyễn Văn A",
    phone: "0901234567",
    email: null,
    shippingAddress: { province: "Hà Nội", ward: "Phường Cầu Giấy", streetAddress: "1 Xuân Thủy" },
    items: [],
    subtotal: 450000,
    discount: 0,
    shippingFee: 30000,
    total: 480000,
    invoiceRequired: false,
    invoiceInfo: null,
    note: null,
    paymentExpiresAt: null,
    canCancel: true,
    createdAt: "2026-10-23T03:00:00Z",
    history: [],
    paymentInstructions,
  });
}

describe("BankTransferInfo", () => {
  it("shows the account, amount, transfer content and QR from the backend", () => {
    render(<BankTransferInfo order={order(INSTRUCTIONS)} />);

    expect(screen.getByRole("heading", { name: "Chuyển khoản để hoàn tất đơn" })).toBeVisible();
    expect(screen.getByText("MBBank")).toBeVisible();
    expect(screen.getByText("0123456789")).toBeVisible();
    expect(screen.getByText("SLVN2610230001")).toBeVisible();
    expect(screen.getByRole("img", { name: /Mã QR chuyển khoản/ })).toHaveAttribute("src", INSTRUCTIONS.qrUrl);
  });

  it("does not render a QR from a non-https address", () => {
    render(<BankTransferInfo order={order({ ...INSTRUCTIONS, qrUrl: "http://example.com/qr.png" })} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("0123456789")).toBeVisible();
  });

  it("asks the customer to contact the shop when the backend has no receiving account", () => {
    render(<BankTransferInfo order={order(null)} />);

    expect(screen.getByText(/Chưa có thông tin tài khoản nhận tiền/)).toBeVisible();
    expect(screen.queryByText("0123456789")).not.toBeInTheDocument();
  });
});
