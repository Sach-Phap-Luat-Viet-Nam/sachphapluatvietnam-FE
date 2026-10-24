import { emptyReceiptLine, receiptFieldErrors, receiptTotals, toIssueBody, toReceiptBody } from "./forms";
import { issueFormSchema, receiptFormSchema, thresholdFormSchema } from "./schemas";
import type { ReceiptFormValues } from "./schemas";

const SKU = { id: 100, label: "Bộ luật Dân sự · Tái bản 3 · Bìa mềm · SLVN-BLDS-BM" };

function line(overrides: Partial<ReceiptFormValues["lines"][number]> = {}) {
  return {
    ...emptyReceiptLine("2026-10-24"),
    sku: SKU,
    batchCode: "lo-2026-10",
    quantity: "500",
    unitCost: "45000",
    ...overrides,
  };
}

describe("receiptFormSchema", () => {
  it("nhận phiếu hợp lệ", () => {
    expect(receiptFormSchema.safeParse({ note: "", lines: [line()] }).success).toBe(true);
  });

  it("bắt chọn SKU, số lượng > 0, giá vốn là số nguyên, ngày có thật", () => {
    const result = receiptFormSchema.safeParse({
      note: "",
      lines: [line({ sku: null, quantity: "0", unitCost: "45.000", receivedAt: "2026-02-30" })],
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join("."));
    expect(paths).toEqual(
      expect.arrayContaining(["lines.0.sku", "lines.0.quantity", "lines.0.unitCost", "lines.0.receivedAt"]),
    );
  });

  it("báo mã lô trùng trong cùng SKU (không phân biệt hoa thường)", () => {
    const result = receiptFormSchema.safeParse({
      note: "",
      lines: [line(), line({ batchCode: "LO-2026-10 " }), line({ sku: { id: 101, label: "khác" } })],
    });
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ["lines", 1, "batchCode"], message: "Mã lô bị trùng với dòng trên." }),
    ]);
  });
});

describe("toReceiptBody", () => {
  it("đổi chuỗi sang số, mã lô viết hoa, ô trống thành null", () => {
    expect(toReceiptBody({ note: "  ", lines: [line({ printerName: " Xưởng in A " })] })).toEqual({
      note: null,
      lines: [
        {
          skuId: 100,
          batchCode: "LO-2026-10",
          printerName: "Xưởng in A",
          quantity: 500,
          unitCost: 45000,
          receivedAt: "2026-10-24",
        },
      ],
    });
  });
});

describe("receiptFieldErrors", () => {
  it("đưa lỗi theo dòng của backend về đúng ô", () => {
    expect(
      receiptFieldErrors({
        "lines[1].unitCost": ["Giá vốn phải ≥ 0"],
        "lines[0].skuId": ["SKU không hợp lệ"],
        note: ["Quá dài"],
        "$.lines": ["JSON sai"],
      }),
    ).toEqual([
      { path: "lines.1.unitCost", message: "Giá vốn phải ≥ 0" },
      { path: "lines.0.sku", message: "SKU không hợp lệ" },
      { path: "note", message: "Quá dài" },
    ]);
  });
});

describe("receiptTotals", () => {
  it("cộng số cuốn và giá vốn", () => {
    expect(
      receiptTotals([
        { quantity: 500, unitCost: 45000 },
        { quantity: 20, unitCost: 0 },
      ]),
    ).toEqual({ quantity: 520, cost: 22_500_000 });
  });
});

describe("form xuất kho và ngưỡng", () => {
  it("xuất kho bắt buộc lý do và số lượng > 0", () => {
    expect(issueFormSchema.safeParse({ type: "damage", quantity: "0", note: " " }).success).toBe(false);
    expect(toIssueBody(100, { type: "gift", quantity: "3", note: " Biếu thư viện " })).toEqual({
      skuId: 100,
      quantity: 3,
      type: "gift",
      note: "Biếu thư viện",
    });
  });

  it("ngưỡng từ 0 đến 100.000", () => {
    expect(thresholdFormSchema.safeParse({ lowStockThreshold: "0" }).success).toBe(true);
    expect(thresholdFormSchema.safeParse({ lowStockThreshold: "100000" }).success).toBe(true);
    expect(thresholdFormSchema.safeParse({ lowStockThreshold: "100001" }).success).toBe(false);
    expect(thresholdFormSchema.safeParse({ lowStockThreshold: "-1" }).success).toBe(false);
  });
});
