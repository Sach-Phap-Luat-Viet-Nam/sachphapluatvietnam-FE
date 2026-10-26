import { z } from "zod";
import { isRealDate } from "@/lib/vn-date";
import { ISSUE_TYPES } from "./labels";

// Response theo docs/api_reference.md, mục "Admin — Kho". OpenAPI sinh số thành `number | string` và enum thành
// `number`, lệch với JSON thật (số nguyên, enum snake_case) nên parse bằng Zod.

export const receiptLineSchema = z.object({
  id: z.number(),
  skuId: z.number(),
  skuCode: z.string(),
  bookTitle: z.string().nullable().default(null),
  editionName: z.string().nullable().default(null),
  coverType: z.string().nullable().default(null),
  batchCode: z.string(),
  printerName: z.string().nullable(),
  quantity: z.number(),
  unitCost: z.number(),
  receivedAt: z.string(),
  /** Lô in tạo ra khi phiếu được duyệt; phiếu chờ duyệt chưa có. */
  printBatchId: z.number().nullable(),
});
export type ReceiptLine = z.infer<typeof receiptLineSchema>;

export const receiptSchema = z.object({
  id: z.number(),
  status: z.string(),
  note: z.string().nullable(),
  createdBy: z.number(),
  createdByName: z.string().nullable().default(null),
  createdAt: z.string(),
  decidedBy: z.number().nullable(),
  decidedByName: z.string().nullable().default(null),
  decidedAt: z.string().nullable(),
  rejectReason: z.string().nullable(),
  lines: z.array(receiptLineSchema),
});
export type Receipt = z.infer<typeof receiptSchema>;

export const stockCardSchema = z.object({
  skuId: z.number(),
  skuCode: z.string(),
  bookTitle: z.string().nullable().default(null),
  editionName: z.string().nullable().default(null),
  coverType: z.string().nullable().default(null),
  available: z.number(),
  reserved: z.number(),
  onHand: z.number(),
  lowStockThreshold: z.number(),
  batches: z.array(
    z.object({
      id: z.number(),
      batchCode: z.string(),
      printerName: z.string().nullable(),
      quantity: z.number(),
      remaining: z.number(),
      unitCost: z.number(),
      receivedAt: z.string(),
    }),
  ),
  recentTransactions: z.array(
    z.object({
      id: z.number(),
      type: z.string(),
      quantity: z.number(),
      printBatchId: z.number().nullable(),
      reference: z.string().nullable(),
      createdBy: z.number().nullable(),
      createdByName: z.string().nullable().default(null),
      note: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});
export type StockCard = z.infer<typeof stockCardSchema>;

export const lowStockSchema = z.object({
  skuId: z.number(),
  skuCode: z.string(),
  bookTitle: z.string(),
  available: z.number(),
  reserved: z.number(),
  lowStockThreshold: z.number(),
});
export type LowStock = z.infer<typeof lowStockSchema>;

/** Một SKU trong kết quả tìm của `GET /admin/inventory/sku-search`; `available` là tồn khả dụng hiện tại. */
export const skuSearchResultSchema = z.object({
  skuId: z.number(),
  skuCode: z.string(),
  bookTitle: z.string(),
  editionName: z.string().nullable(),
  coverType: z.string(),
  isbn: z.string(),
  isLatestEdition: z.boolean(),
  available: z.number(),
});
export type SkuSearchResult = z.infer<typeof skuSearchResultSchema>;

/** SKU đã chọn trong form: giữ nhãn (tên sách · ấn bản · mã SKU) để hiển thị. */
export const skuOptionSchema = z.object({ id: z.number(), label: z.string() });
export type SkuOption = z.infer<typeof skuOptionSchema>;

// Form: ô nhập giữ dạng chuỗi như trong `<input>`, chuyển sang kiểu của API ở forms.ts.

const REQUIRED = "Anh/chị nhập thông tin này.";

function requiredText(max: number) {
  return z.string().trim().min(1, REQUIRED).max(max, `Tối đa ${max} ký tự.`);
}

const positiveInteger = z
  .string()
  .trim()
  .regex(/^[1-9]\d{0,8}$/, "Nhập số nguyên lớn hơn 0.");

export const receiptLineFormSchema = z.object({
  // `Boolean(...)` thay cho `sku !== null` để Zod không thu hẹp kiểu: giá trị form vẫn nhận `null` lúc chưa chọn.
  sku: skuOptionSchema.nullable().refine((sku) => Boolean(sku), "Anh/chị chọn SKU."),
  batchCode: requiredText(50),
  printerName: z.string().trim().max(255, "Tối đa 255 ký tự."),
  quantity: positiveInteger,
  unitCost: z
    .string()
    .trim()
    .regex(/^\d{1,12}$/, "Giá vốn là số nguyên VNĐ từ 0, không có dấu chấm."),
  receivedAt: z.string().refine(isRealDate, "Nhập ngày nhập theo dạng dd/mm/yyyy."),
});
export type ReceiptLineFormValues = z.infer<typeof receiptLineFormSchema>;

export const receiptFormSchema = z
  .object({
    note: z.string().trim().max(1000, "Tối đa 1000 ký tự."),
    lines: z.array(receiptLineFormSchema).min(1, "Phiếu cần ít nhất một dòng."),
  })
  .superRefine(({ lines }, ctx) => {
    // Backend tự đổi mã lô sang chữ hoa và không cho trùng mã lô trong cùng SKU.
    const seen = new Set<string>();
    lines.forEach((line, index) => {
      if (!line.sku) {
        return;
      }
      const key = `${line.sku.id}|${line.batchCode.trim().toUpperCase()}`;
      if (seen.has(key)) {
        ctx.addIssue({ code: "custom", path: ["lines", index, "batchCode"], message: "Mã lô bị trùng với dòng trên." });
      }
      seen.add(key);
    });
  });
export type ReceiptFormValues = z.infer<typeof receiptFormSchema>;

export const rejectFormSchema = z.object({ reason: requiredText(1000) });
export type RejectFormValues = z.infer<typeof rejectFormSchema>;

export const thresholdFormSchema = z.object({
  lowStockThreshold: z
    .string()
    .trim()
    .regex(/^\d{1,6}$/, "Nhập số nguyên từ 0 đến 100.000.")
    .refine((value) => Number(value) <= 100_000, "Nhập số nguyên từ 0 đến 100.000."),
});
export type ThresholdFormValues = z.infer<typeof thresholdFormSchema>;

export const issueFormSchema = z.object({
  type: z.enum(ISSUE_TYPES, "Anh/chị chọn loại xuất."),
  quantity: positiveInteger,
  note: requiredText(1000),
});
export type IssueFormValues = z.infer<typeof issueFormSchema>;
