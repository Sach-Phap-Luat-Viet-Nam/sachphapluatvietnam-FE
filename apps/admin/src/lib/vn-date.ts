// Ô ngày hiển thị theo `dd/mm/yyyy`. Giá trị trong form là `YYYY-MM-DD` (kiểu `DateOnly` của backend) để so sánh chuỗi
// là so sánh ngày. Cùng cách làm với ô ngày giờ ở vn-datetime.ts.

const INTERNAL = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Độ dài tối đa của chuỗi hiển thị `dd/mm/yyyy`. */
export const DATE_DISPLAY_LENGTH = 10;

/** Ngày dạng `YYYY-MM-DD` có thật (không phải 31/02, 29/02 năm không nhuận). */
export function isRealDate(value: string): boolean {
  const match = INTERNAL.exec(value);
  if (!match) {
    return false;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    year >= 1000 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Tự thêm `/` khi gõ: chỉ giữ chữ số (tối đa 8) rồi dựng lại `dd/mm/yyyy`. */
export function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const groups: Array<[number, number]> = [
    [0, 2],
    [2, 4],
    [4, 8],
  ];
  return groups
    .map(([from, to]) => digits.slice(from, to))
    .filter(Boolean)
    .join("/");
}

/** `2026-11-01` → `01/11/2026`. Giá trị lạ (đang gõ dở) giữ nguyên. */
export function dateToDisplay(value: string): string {
  const match = INTERNAL.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/** `01/11/2026` → `2026-11-01`. Chuỗi chưa đủ hoặc ngày không có thật giữ nguyên để schema báo lỗi. */
export function displayToDate(text: string): string {
  const match = DISPLAY.exec(text);
  if (!match) {
    return text;
  }
  const value = `${match[3]}-${match[2]}-${match[1]}`;
  return isRealDate(value) ? value : text;
}
