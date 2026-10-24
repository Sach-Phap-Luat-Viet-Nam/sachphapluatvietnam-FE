import type { BadgeTone } from "@/components/StatusBadge";

// Giá trị enum (snake_case) và nhãn tiếng Việt theo "Bảng enum" trong docs/api_reference.md.

export const BOOK_TYPES = ["code", "consolidated", "commentary", "qna", "textbook", "monograph"] as const;
export type BookType = (typeof BOOK_TYPES)[number];
export const BOOK_TYPE_LABELS: Record<BookType, string> = {
  code: "Bộ luật",
  consolidated: "Văn bản hợp nhất",
  commentary: "Chú giải",
  qna: "Hỏi – đáp",
  textbook: "Giáo trình",
  monograph: "Sách chuyên khảo",
};

export const BOOK_STATUSES = ["draft", "active", "hidden"] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];
export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  draft: "Nháp",
  active: "Đang hiển thị",
  hidden: "Ẩn",
};

export const TARGET_AUDIENCES = ["student", "lawyer", "business", "citizen"] as const;
export type TargetAudience = (typeof TARGET_AUDIENCES)[number];
export const TARGET_AUDIENCE_LABELS: Record<TargetAudience, string> = {
  student: "Sinh viên",
  lawyer: "Luật sư",
  business: "Doanh nghiệp",
  citizen: "Người dân",
};

export const EDITION_STATUSES = ["draft", "upcoming", "on_sale", "discontinued", "clearance"] as const;
export type EditionStatus = (typeof EDITION_STATUSES)[number];
export const EDITION_STATUS_LABELS: Record<EditionStatus, string> = {
  draft: "Nháp",
  upcoming: "Sắp phát hành",
  on_sale: "Đang bán",
  discontinued: "Ngừng bán",
  clearance: "Thanh lý",
};

export const COVER_TYPES = ["paperback", "hardcover"] as const;
export type CoverType = (typeof COVER_TYPES)[number];
export const COVER_TYPE_LABELS: Record<CoverType, string> = {
  paperback: "Bìa mềm",
  hardcover: "Bìa cứng",
};

export const LEGAL_DOCUMENT_TYPES = [
  "constitution",
  "code",
  "law",
  "ordinance",
  "resolution",
  "decree",
  "decision",
  "circular",
  "joint_circular",
  "other",
] as const;
export type LegalDocumentType = (typeof LEGAL_DOCUMENT_TYPES)[number];
export const LEGAL_DOCUMENT_TYPE_LABELS: Record<LegalDocumentType, string> = {
  constitution: "Hiến pháp",
  code: "Bộ luật",
  law: "Luật",
  ordinance: "Pháp lệnh",
  resolution: "Nghị quyết",
  decree: "Nghị định",
  decision: "Quyết định",
  circular: "Thông tư",
  joint_circular: "Thông tư liên tịch",
  other: "Khác",
};

const BOOK_STATUS_TONES: Record<string, BadgeTone> = { active: "success", draft: "neutral", hidden: "warning" };

const EDITION_STATUS_TONES: Record<string, BadgeTone> = {
  on_sale: "success",
  clearance: "info",
  upcoming: "info",
  discontinued: "warning",
  draft: "neutral",
};

/** Màu nhãn trạng thái đầu sách. */
export function bookStatusTone(status: string): BadgeTone {
  return BOOK_STATUS_TONES[status] ?? "neutral";
}

/** Màu nhãn trạng thái ấn bản. */
export function editionStatusTone(status: string): BadgeTone {
  return EDITION_STATUS_TONES[status] ?? "neutral";
}

/** Nhãn của một giá trị enum; backend có thể thêm giá trị mới nên giá trị lạ giữ nguyên mã. */
export function enumLabel(labels: Record<string, string>, value: string): string {
  return Object.hasOwn(labels, value) ? (labels[value] ?? value) : value;
}
