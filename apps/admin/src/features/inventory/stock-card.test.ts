import { batchLabel, isLowStock, referenceHref } from "./stock-card";

describe("referenceHref", () => {
  it("phiếu nhập luôn có link, mã đơn chỉ khi được vào phần Đơn hàng", () => {
    expect(referenceHref("GR-7", false)).toBe("/kho/phieu-nhap/7");
    expect(referenceHref("SLVN2610230001", true)).toBe("/don-hang/SLVN2610230001");
    expect(referenceHref("SLVN2610230001", false)).toBeNull();
    expect(referenceHref("ISSUE-20261024101500", true)).toBeNull();
    expect(referenceHref(null, true)).toBeNull();
  });
});

describe("batchLabel", () => {
  const batches = [
    {
      id: 21,
      batchCode: "LO-2026-10",
      printerName: null,
      quantity: 500,
      remaining: 495,
      unitCost: 45000,
      receivedAt: "2026-10-20",
    },
  ];

  it("lấy mã lô theo id, lô lạ thì hiện id", () => {
    expect(batchLabel(batches, 21)).toBe("LO-2026-10");
    expect(batchLabel(batches, 99)).toBe("Lô #99");
    expect(batchLabel(batches, null)).toBeNull();
  });
});

describe("isLowStock", () => {
  it("chỉ tính SKU đã từng nhập kho", () => {
    const batch = {
      id: 1,
      batchCode: "A",
      printerName: null,
      quantity: 10,
      remaining: 10,
      unitCost: 0,
      receivedAt: "2026-10-01",
    };
    expect(isLowStock({ available: 10, lowStockThreshold: 50, batches: [batch] })).toBe(true);
    expect(isLowStock({ available: 51, lowStockThreshold: 50, batches: [batch] })).toBe(false);
    expect(isLowStock({ available: 0, lowStockThreshold: 50, batches: [] })).toBe(false);
  });
});
