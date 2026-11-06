import { describe, expect, it } from "vitest";
import { freeShippingProgress } from "./checkout-preview";

const base = { freeShippingThreshold: 300000, amountToFreeShipping: 0, shippingFee: 30000, shippingDiscount: 0 };

describe("freeShippingProgress", () => {
  it("tính phần còn thiếu và phần trăm từ số của backend", () => {
    expect(freeShippingProgress({ ...base, amountToFreeShipping: 75000 })).toEqual({
      reached: false,
      remaining: 75000,
      percent: 75,
    });
  });

  it("báo đã đủ ngưỡng khi không còn thiếu", () => {
    expect(freeShippingProgress({ ...base, shippingFee: 0 })).toEqual({ reached: true });
  });

  it("không báo đã miễn phí khi phí ship vẫn còn", () => {
    expect(freeShippingProgress(base)).toBeNull();
  });

  it("không nhắc khi shop không có ngưỡng", () => {
    expect(freeShippingProgress({ ...base, freeShippingThreshold: null, amountToFreeShipping: 50000 })).toBeNull();
    expect(freeShippingProgress({ ...base, freeShippingThreshold: 0, amountToFreeShipping: 50000 })).toBeNull();
  });

  it("không nhắc mua thêm khi phí ship đã được khuyến mãi khác miễn hết", () => {
    expect(freeShippingProgress({ ...base, amountToFreeShipping: 50000, shippingDiscount: 30000 })).toBeNull();
  });

  it("vẫn nhắc khi khuyến mãi chỉ giảm một phần phí ship", () => {
    expect(freeShippingProgress({ ...base, amountToFreeShipping: 50000, shippingDiscount: 10000 })).toMatchObject({
      reached: false,
      remaining: 50000,
    });
  });

  it("giữ phần trăm trong khoảng 0–100 khi số liệu lệch", () => {
    expect(freeShippingProgress({ ...base, amountToFreeShipping: 400000 })).toMatchObject({ percent: 0 });
  });
});
