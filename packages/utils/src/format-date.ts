export const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VN_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VN_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Chuỗi ngày thuần (`2026-01-15`, kiểu `date` của OpenAPI) không có giờ; parse theo UTC rồi format theo UTC
 * để không bị lệch sang ngày hôm trước/hôm sau do múi giờ.
 */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Định dạng ngày theo giờ Việt Nam, ví dụ `15/01/2026`. Trả `null` khi giá trị rỗng hoặc không hợp lệ. */
export function formatDate(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string" && DATE_ONLY_PATTERN.test(value)) {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime())
      ? null
      : new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(
          date,
        );
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

// `en-CA` cho định dạng `YYYY-MM-DD`.
const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: VN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Ngày theo giờ Việt Nam dạng `2026-01-15`, dùng làm khóa so sánh "cùng ngày" (ví dụ tần suất một lần mỗi ngày). */
export function vnDateKey(date: Date): string {
  return dateKeyFormatter.format(date);
}

/** Định dạng ngày giờ theo giờ Việt Nam, ví dụ `15/01/2026, 14:30`. */
export function formatDateTime(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateTimeFormatter.format(date);
}
