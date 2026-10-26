import { vi } from "vitest";
import { addComboToCart, comboCopies } from "./buy-combo";

const LINES = [
  { skuId: 11, quantity: 1 },
  { skuId: 12, quantity: 2 },
  { skuId: 13, quantity: 1 },
];

describe("comboCopies", () => {
  it("cộng số cuốn của cả bộ", () => {
    expect(comboCopies(LINES)).toBe(4);
  });
});

describe("addComboToCart", () => {
  it("thêm lần lượt từng sách với đúng số cuốn trong một bộ", async () => {
    const add = vi.fn().mockResolvedValue(undefined);

    const result = await addComboToCart(LINES, add);

    expect(add.mock.calls).toEqual([[LINES[0]], [LINES[1]], [LINES[2]]]);
    expect(result).toEqual({ added: 3, error: null });
  });

  it("dừng ở sách đầu tiên lỗi, báo đã thêm mấy dòng và không thêm các sách còn lại", async () => {
    const failure = new Error("OUT_OF_STOCK");
    const add = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(failure);

    const result = await addComboToCart(LINES, add);

    expect(add).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ added: 1, error: failure });
  });

  it("lỗi ngay ở sách đầu thì chưa thêm gì", async () => {
    const failure = new Error("SKU_NOT_AVAILABLE");

    const result = await addComboToCart(LINES, () => Promise.reject(failure));

    expect(result).toEqual({ added: 0, error: failure });
  });
});
