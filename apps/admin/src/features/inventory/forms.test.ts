import {
  duplicateReceiptLine,
  emptyReceiptLine,
  nextReceiptLine,
  receiptBooksSummary,
  receiptFieldErrors,
  receiptToFormValues,
  receiptTotals,
  suggestBatchCode,
  toIssueBody,
  toReceiptBody,
} from "./forms";
import { receiptSchema } from "./schemas";
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

describe("thêm và nhân bản dòng phiếu", () => {
  it("dòng mới giữ xưởng in và ngày nhập của dòng trước, còn lại để trống", () => {
    const next = nextReceiptLine(line({ printerName: "Xưởng A", receivedAt: "2026-10-20" }));

    expect(next).toEqual({
      sku: null,
      batchCode: "",
      printerName: "Xưởng A",
      quantity: "",
      unitCost: "",
      receivedAt: "2026-10-20",
    });
  });

  it("nhân bản giữ SKU, xưởng in, giá vốn, ngày nhập nhưng bỏ mã lô và số lượng", () => {
    const copy = duplicateReceiptLine(line({ printerName: "Xưởng A" }));

    expect(copy).toMatchObject({ sku: SKU, printerName: "Xưởng A", unitCost: "45000", receivedAt: "2026-10-24" });
    expect(copy.batchCode).toBe("");
    expect(copy.quantity).toBe("");
  });

  it("gợi ý mã lô theo ngày nhập", () => {
    expect(suggestBatchCode("2026-10-26")).toBe("LO-261026");
    expect(suggestBatchCode("")).toBe("");
  });
});

describe("receiptToFormValues", () => {
  const saved = receiptSchema.parse({
    id: 7,
    status: "draft",
    note: "Nhập lô tháng 10",
    createdBy: 4,
    createdAt: "2026-10-24T03:00:00Z",
    decidedBy: null,
    decidedAt: null,
    rejectReason: null,
    lines: [
      {
        id: 1,
        skuId: 100,
        skuCode: "SLVN-BLDS-BM",
        bookTitle: "Bộ luật Dân sự 2026",
        editionName: "Tái bản lần 3",
        coverType: "paperback",
        batchCode: "LO-01",
        printerName: null,
        quantity: 500,
        unitCost: 45000,
        receivedAt: "2026-10-20",
        printBatchId: null,
      },
      {
        id: 2,
        skuId: 101,
        skuCode: "SLVN-LDD-BC",
        batchCode: "LO-02",
        printerName: "Xưởng A",
        quantity: 20,
        unitCost: 10000,
        receivedAt: "2026-10-21",
        printBatchId: null,
      },
    ],
  });

  it("đưa phiếu đã lưu về giá trị form để sửa", () => {
    const values = receiptToFormValues(saved);

    expect(values.note).toBe("Nhập lô tháng 10");
    expect(values.lines[0]).toEqual({
      sku: { id: 100, label: "Bộ luật Dân sự 2026 · Tái bản lần 3 · Bìa mềm · SLVN-BLDS-BM" },
      batchCode: "LO-01",
      printerName: "",
      quantity: "500",
      unitCost: "45000",
      receivedAt: "2026-10-20",
    });
    expect(values.lines[1]?.sku?.label).toBe("SLVN-LDD-BC");
    expect(receiptFormSchema.safeParse(values).success).toBe(true);
  });

  it("tóm tắt sách của phiếu", () => {
    expect(receiptBooksSummary(saved)).toBe("Bộ luật Dân sự 2026 (+1)");
    expect(receiptBooksSummary({ lines: [] })).toBe("—");
  });
});
