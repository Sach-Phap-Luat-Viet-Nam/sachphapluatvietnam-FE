import type { BadgeTone } from "@/components/StatusBadge";

// Theo docs/features/popup.md: tần suất hiển thị do Storefront tự áp, trạng thái do backend tính lúc trả về.

export const DISPLAY_FREQUENCIES = ["every_visit", "once_per_session", "once_per_day"] as const;
export type DisplayFrequency = (typeof DISPLAY_FREQUENCIES)[number];
export const DISPLAY_FREQUENCY_LABELS: Record<DisplayFrequency, string> = {
  every_visit: "Mỗi lần tải trang",
  once_per_session: "Một lần mỗi phiên trình duyệt",
  once_per_day: "Một lần mỗi ngày",
};

const STATUS_LABELS: Record<string, string> = {
  inactive: "Đang tắt",
  scheduled: "Chờ đến lịch",
  running: "Đang chạy",
  ended: "Đã kết thúc",
};

const STATUS_TONES: Record<string, BadgeTone> = {
  inactive: "neutral",
  scheduled: "info",
  running: "success",
  ended: "warning",
};

/** Nhãn trạng thái popup; trạng thái lạ (backend thêm mới) giữ nguyên mã. */
export function popupStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function popupStatusTone(status: string): BadgeTone {
  return STATUS_TONES[status] ?? "neutral";
}

export function displayFrequencyLabel(value: string): string {
  const frequency = DISPLAY_FREQUENCIES.find((item) => item === value);
  return frequency ? DISPLAY_FREQUENCY_LABELS[frequency] : value;
}
