import { formatDate, formatDateTime } from "./format-date";

describe("formatDate", () => {
  it("giữ nguyên ngày với chuỗi ngày thuần, không lệch múi giờ", () => {
    expect(formatDate("2026-01-01")).toBe("01/01/2026");
  });

  it("đổi mốc UTC sang ngày theo giờ Việt Nam", () => {
    // 17:30 UTC ngày 31/12 là 00:30 ngày 01/01 ở Việt Nam (UTC+7).
    expect(formatDate("2025-12-31T17:30:00Z")).toBe("01/01/2026");
  });

  it.each([null, undefined, "", "khong-phai-ngay"])("trả null với giá trị không hợp lệ (%s)", (value) => {
    expect(formatDate(value)).toBeNull();
  });
});

describe("formatDateTime", () => {
  it("hiển thị giờ theo múi giờ Việt Nam", () => {
    expect(formatDateTime("2026-03-10T07:05:00Z")).toBe("14:05 10/03/2026");
  });
});
