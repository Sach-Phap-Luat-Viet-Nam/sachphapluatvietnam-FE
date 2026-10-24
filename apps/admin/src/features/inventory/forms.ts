import type { IssueFormValues, ReceiptFormValues, ReceiptLineFormValues, ThresholdFormValues } from "./schemas";

// Chuyển giá trị form (chuỗi) sang body của API Kho.

export interface ReceiptLineBody {
  skuId: number;
  batchCode: string;
  printerName: string | null;
  quantity: number;
  unitCost: number;
  receivedAt: string;
}

export interface ReceiptBody {
  note: string | null;
  lines: ReceiptLineBody[];
}

/** Dòng trống cho form lập phiếu; ngày nhập mặc định là hôm nay (`today` dạng `YYYY-MM-DD`). */
export function emptyReceiptLine(today: string): ReceiptLineFormValues {
  return { sku: null, batchCode: "", printerName: "", quantity: "", unitCost: "", receivedAt: today };
}

export function toReceiptBody(values: ReceiptFormValues): ReceiptBody {
  return {
    note: values.note.trim() || null,
    lines: values.lines.flatMap((line) =>
      line.sku
        ? [
            {
              skuId: line.sku.id,
              batchCode: line.batchCode.trim().toUpperCase(),
              printerName: line.printerName.trim() || null,
              quantity: Number(line.quantity),
              unitCost: Number(line.unitCost),
              receivedAt: line.receivedAt,
            },
          ]
        : [],
    ),
  };
}

export interface ReceiptFieldError {
  path: "note" | `lines.${number}.${keyof ReceiptLineFormValues}`;
  message: string;
}

const LINE_FIELDS: Record<string, keyof ReceiptLineFormValues> = {
  skuId: "sku",
  batchCode: "batchCode",
  printerName: "printerName",
  quantity: "quantity",
  unitCost: "unitCost",
  receivedAt: "receivedAt",
};

/**
 * Lỗi `VALIDATION_ERROR` của backend theo ô trong form lập phiếu: key `lines[0].unitCost` → `lines.0.unitCost`,
 * `note` → `note`. Key không thuộc ô nào thì bỏ qua (form hiện lỗi chung).
 */
export function receiptFieldErrors(errors: Readonly<Record<string, readonly string[]>>): ReceiptFieldError[] {
  return Object.entries(errors).flatMap(([key, messages]): ReceiptFieldError[] => {
    const message = messages[0];
    if (!message) {
      return [];
    }
    if (key === "note") {
      return [{ path: "note", message }];
    }
    const match = /^lines\[(\d+)\]\.(\w+)$/.exec(key);
    const field = match?.[2] ? LINE_FIELDS[match[2]] : undefined;
    return match && field ? [{ path: `lines.${Number(match[1])}.${field}`, message }] : [];
  });
}

export function toThresholdBody(values: ThresholdFormValues): { lowStockThreshold: number } {
  return { lowStockThreshold: Number(values.lowStockThreshold) };
}

export interface IssueBody {
  skuId: number;
  quantity: number;
  type: IssueFormValues["type"];
  note: string;
}

export function toIssueBody(skuId: number, values: IssueFormValues): IssueBody {
  return { skuId, quantity: Number(values.quantity), type: values.type, note: values.note.trim() };
}

/** Tổng số cuốn và tổng giá vốn của phiếu, để hiện ở cuối form/chi tiết phiếu. */
export function receiptTotals(lines: ReadonlyArray<{ quantity: number; unitCost: number }>): {
  quantity: number;
  cost: number;
} {
  return lines.reduce(
    (total, line) => ({ quantity: total.quantity + line.quantity, cost: total.cost + line.quantity * line.unitCost }),
    { quantity: 0, cost: 0 },
  );
}
