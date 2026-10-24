import { dateToDisplay, displayToDate, isRealDate, maskDate } from "./vn-date";

describe("maskDate", () => {
  it("tự thêm dấu / khi gõ số liền", () => {
    expect(maskDate("2")).toBe("2");
    expect(maskDate("201")).toBe("20/1");
    expect(maskDate("20102026")).toBe("20/10/2026");
    expect(maskDate("20/10/2026999")).toBe("20/10/2026");
  });

  it("xóa lùi qua dấu phân cách vẫn được", () => {
    expect(maskDate("20/")).toBe("20");
  });
});

describe("displayToDate / dateToDisplay", () => {
  it("đổi qua lại giữa dd/mm/yyyy và YYYY-MM-DD", () => {
    expect(displayToDate("01/11/2026")).toBe("2026-11-01");
    expect(dateToDisplay("2026-11-01")).toBe("01/11/2026");
  });

  it("giữ nguyên chuỗi gõ dở hoặc ngày không có thật", () => {
    expect(displayToDate("01/11/20")).toBe("01/11/20");
    expect(displayToDate("31/02/2026")).toBe("31/02/2026");
    expect(displayToDate("")).toBe("");
  });
});

describe("isRealDate", () => {
  it("chặn ngày không có thật", () => {
    expect(isRealDate("2028-02-29")).toBe(true);
    expect(isRealDate("2026-02-29")).toBe(false);
    expect(isRealDate("2026-13-01")).toBe(false);
    expect(isRealDate("01/11/2026")).toBe(false);
  });
});
