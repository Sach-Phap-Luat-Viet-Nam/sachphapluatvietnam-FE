import { orderSchema } from "./schemas";
import type { Order } from "./schemas";
import {
  GUEST_POLL_MS,
  MEMBER_POLL_MS,
  formatCountdown,
  isAwaitingTransfer,
  paymentPollInterval,
  remainingSeconds,
  safeQrUrl,
} from "./payment";

function order(overrides: Record<string, unknown> = {}): Order {
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

describe("isAwaitingTransfer", () => {
  it("is true only for unpaid, not cancelled bank transfer orders", () => {
    expect(isAwaitingTransfer(order())).toBe(true);
    expect(isAwaitingTransfer(order({ paymentStatus: "paid", status: "paid" }))).toBe(false);
    expect(isAwaitingTransfer(order({ status: "cancelled" }))).toBe(false);
    expect(isAwaitingTransfer(order({ paymentMethod: "cod", status: "pending_confirm" }))).toBe(false);
  });
});

describe("paymentPollInterval", () => {
  it("polls an order waiting for money, faster for members than guests", () => {
    expect(paymentPollInterval(order(), true)).toBe(MEMBER_POLL_MS);
    expect(paymentPollInterval(order(), false)).toBe(GUEST_POLL_MS);
  });

  it("stops once the order is paid, cancelled or not loaded", () => {
    expect(paymentPollInterval(order({ paymentStatus: "paid", status: "paid" }), true)).toBe(false);
    expect(paymentPollInterval(order({ status: "cancelled" }), true)).toBe(false);
    expect(paymentPollInterval(undefined, true)).toBe(false);
  });
});

describe("safeQrUrl", () => {
  it("accepts https only", () => {
    expect(safeQrUrl("https://qr.sepay.vn/img?acc=1")).toBe("https://qr.sepay.vn/img?acc=1");
    expect(safeQrUrl("http://qr.sepay.vn/img")).toBeNull();
    expect(safeQrUrl("javascript:alert(1)")).toBeNull();
    expect(safeQrUrl("not a url")).toBeNull();
  });
});

describe("countdown helpers", () => {
  it("never goes below zero and formats mm:ss", () => {
    const now = new Date("2026-10-23T03:00:00Z");
    expect(remainingSeconds("2026-10-23T03:29:59Z", now)).toBe(1799);
    expect(remainingSeconds("2026-10-23T02:00:00Z", now)).toBe(0);
    expect(remainingSeconds("invalid", now)).toBe(0);
    expect(formatCountdown(1799)).toBe("29:59");
  });
});
