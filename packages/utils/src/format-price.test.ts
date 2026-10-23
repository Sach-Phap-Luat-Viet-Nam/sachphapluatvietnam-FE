import { formatDiscount, formatPrice } from "./format-price";

describe("formatPrice", () => {
  it("định dạng số nguyên VNĐ có dấu chấm ngăn cách hàng nghìn", () => {
    expect(formatPrice(185000)).toBe("185.000 ₫");
  });

  it("định dạng số 0", () => {
    expect(formatPrice(0)).toBe("0 ₫");
  });

  it("định dạng số lớn", () => {
    expect(formatPrice(1250000)).toBe("1.250.000 ₫");
  });
});

describe("formatDiscount", () => {
  it.each([null, undefined, 0, -5])("trả null khi không có giảm giá (%s)", (value) => {
    expect(formatDiscount(value)).toBeNull();
  });

  it("thêm dấu trừ và phần trăm", () => {
    expect(formatDiscount(15)).toBe("-15%");
  });
});
