import { freeShippingText } from "./shipping-threshold";

describe("freeShippingText", () => {
  it("writes the threshold from the backend", () => {
    expect(freeShippingText(300000)).toBe("Miễn phí vận chuyển cho đơn từ 300.000đ");
    expect(freeShippingText(500000)).toBe("Miễn phí vận chuyển cho đơn từ 500.000đ");
  });

  it("says nothing when there is no threshold", () => {
    expect(freeShippingText(null)).toBeNull();
    expect(freeShippingText(0)).toBeNull();
  });
});
