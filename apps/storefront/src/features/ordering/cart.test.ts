import { describe, expect, it } from "vitest";
import { ApiError } from "@slvn/api-client";
import { checkoutBlocker, freeShippingGap, lineIssue } from "./cart";
import { orderingErrorMessage } from "./errors";
import { formatCountdown, remainingSeconds } from "./payment";

const line = { isSellable: true, quantity: 2, availableQuantity: 13 };

describe("lineIssue", () => {
  it("flags discontinued lines before stock shortages", () => {
    expect(lineIssue(line)).toBeNull();
    expect(lineIssue({ ...line, quantity: 14 })).toBe("short");
    expect(lineIssue({ ...line, isSellable: false, quantity: 14 })).toBe("unsellable");
  });
});

describe("checkoutBlocker", () => {
  it("blocks empty carts and carts the backend would reject", () => {
    expect(checkoutBlocker({ items: [] })).toBe("Giỏ sách đang trống.");
    expect(checkoutBlocker({ items: [line, { ...line, isSellable: false }] })).toMatch(/ngừng bán/);
    expect(checkoutBlocker({ items: [line, { ...line, availableQuantity: 0 }] })).toMatch(/không đủ số lượng/);
    expect(checkoutBlocker({ items: [line] })).toBeNull();
  });
});

describe("freeShippingGap", () => {
  it("returns the amount left before free shipping", () => {
    expect(freeShippingGap(250000, { freeShippingThreshold: 300000 })).toBe(50000);
    expect(freeShippingGap(300000, { freeShippingThreshold: 300000 })).toBeNull();
  });
});

describe("orderingErrorMessage", () => {
  it("maps business codes, overrides and server errors", () => {
    const outOfStock = new ApiError({ status: 409, code: "OUT_OF_STOCK", title: "Sách đã hết hàng" });
    expect(orderingErrorMessage(outOfStock)).toMatch(/không còn đủ số lượng/);

    const notFound = new ApiError({ status: 404, code: "NOT_FOUND", title: "Không tìm thấy" });
    expect(orderingErrorMessage(notFound, { NOT_FOUND: "Không có đơn này." })).toBe("Không có đơn này.");

    const server = new ApiError({ status: 500, code: "INTERNAL_ERROR", title: "Lỗi", traceId: "00-trace" });
    expect(orderingErrorMessage(server)).toBe("Lỗi Mã tra cứu: 00-trace");

    expect(orderingErrorMessage(new TypeError("Failed to fetch"))).toMatch(/Không kết nối được máy chủ/);
  });
});

describe("payment countdown", () => {
  it("counts down to paymentExpiresAt and stops at zero", () => {
    const now = new Date("2026-10-23T03:00:00Z");
    expect(remainingSeconds("2026-10-23T03:30:00Z", now)).toBe(1800);
    expect(remainingSeconds("2026-10-23T02:59:00Z", now)).toBe(0);
    expect(remainingSeconds("không phải ngày", now)).toBe(0);
    expect(formatCountdown(1799)).toBe("29:59");
    expect(formatCountdown(65)).toBe("01:05");
  });
});
