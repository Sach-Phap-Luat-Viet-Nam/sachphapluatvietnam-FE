// Ô ngày giờ hiển thị theo `dd/mm/yyyy hh:mm` (24 giờ, giờ Việt Nam). Giá trị trong form vẫn là
// `YYYY-MM-DDTHH:mm` (định dạng của `<input type="datetime-local">`) để so sánh chuỗi là so sánh thời gian.

const INTERNAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const DISPLAY = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/;

/** Độ dài tối đa của chuỗi hiển thị `dd/mm/yyyy hh:mm`. */
export const DISPLAY_LENGTH = 16;

function isRealDateTime(year: number, month: number, day: number, hour: number, minute: number): boolean {
  if (year < 1000 || hour > 23 || minute > 59) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * Tự thêm `/`, khoảng trắng và `:` khi gõ: chỉ giữ chữ số (tối đa 12) rồi dựng lại `dd/mm/yyyy hh:mm`. Dấu phân cách
 * chỉ thêm khi đã có chữ số đứng sau, nên xóa lùi qua dấu phân cách vẫn hoạt động.
 */
export function maskDateTime(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  const groups: Array<[number, number, string]> = [
    [0, 2, ""],
    [2, 4, "/"],
    [4, 8, "/"],
    [8, 10, " "],
    [10, 12, ":"],
  ];
  return groups.reduce((text, [from, to, separator]) => {
    const part = digits.slice(from, to);
    return part ? text + separator + part : text;
  }, "");
}

/** `2026-11-01T08:30` → `01/11/2026 08:30`. Giá trị lạ (đang gõ dở) giữ nguyên. */
export function internalToDisplay(value: string): string {
  const match = INTERNAL.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}` : value;
}

/**
 * `01/11/2026 08:30` → `2026-11-01T08:30`. Chuỗi trống trả `""`; chuỗi chưa đủ hoặc ngày giờ không có thật (31/02,
 * 25:00) giữ nguyên để schema báo lỗi.
 */
export function displayToInternal(text: string): string {
  const match = DISPLAY.exec(text);
  if (!match) {
    return text;
  }
  const [, day, month, year, hour, minute] = match;
  const valid = isRealDateTime(Number(year), Number(month), Number(day), Number(hour), Number(minute));
  return valid ? `${year}-${month}-${day}T${hour}:${minute}` : text;
}

// Việt Nam không đổi giờ theo mùa: luôn UTC+7. Ô ngày giờ nhập theo giờ Việt Nam, backend nhận kèm offset và trả về UTC.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const VN_OFFSET = "+07:00";

/** Thời điểm UTC từ backend → giá trị ô ngày giờ (`YYYY-MM-DDTHH:mm`) theo giờ Việt Nam. */
export function toVnDateTimeInput(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const time = Date.parse(iso);
  return Number.isNaN(time) ? "" : new Date(time + VN_OFFSET_MS).toISOString().slice(0, 16);
}

/** Giá trị ô ngày giờ (giờ Việt Nam) → chuỗi kèm offset gửi backend: `2026-11-01T08:30:00+07:00`. */
export function fromVnDateTimeInput(value: string): string {
  return `${value}:00${VN_OFFSET}`;
}
