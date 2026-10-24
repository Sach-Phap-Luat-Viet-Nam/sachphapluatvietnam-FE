import type { BadgeTone } from "@/components/StatusBadge";

// Giá trị enum (snake_case) và nhãn tiếng Việt theo "Bảng enum" trong docs/api_reference.md.

export const RECEIPT_STATUSES = ["draft", "approved", "rejected"] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];
export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  draft: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  import: "Nhập kho",
  sale: "Bán",
  return: "Hoàn về",
  adjust: "Điều chỉnh",
  damage: "Hủy hàng lỗi",
  gift: "Biếu tặng",
};

export const ISSUE_TYPES = ["damage", "gift"] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];
export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  damage: "Hủy hàng lỗi",
  gift: "Biếu tặng",
};

export const COVER_TYPE_LABELS: Record<string, string> = { paperback: "Bìa mềm", hardcover: "Bìa cứng" };

const RECEIPT_STATUS_TONES: Record<string, BadgeTone> = { draft: "warning", approved: "success", rejected: "danger" };

/** Màu nhãn trạng thái phiếu nhập. */
export function receiptStatusTone(status: string): BadgeTone {
  return RECEIPT_STATUS_TONES[status] ?? "neutral";
}
