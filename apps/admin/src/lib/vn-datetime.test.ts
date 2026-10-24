import { displayToInternal, internalToDisplay, maskDateTime } from "./vn-datetime";

describe("maskDateTime", () => {
  it.each([
    ["", ""],
    ["0", "0"],
    ["01", "01"],
    ["011", "01/1"],
    ["01112026", "01/11/2026"],
    ["011120260", "01/11/2026 0"],
    ["0111202608", "01/11/2026 08"],
    ["01112026083", "01/11/2026 08:3"],
    ["011120260830", "01/11/2026 08:30"],
  ])("gõ %j thành %j", (raw, expected) => {
    expect(maskDateTime(raw)).toBe(expected);
  });

  it("bỏ ký tự không phải số, dán cả chuỗi có sẵn dấu phân cách, cắt phần thừa", () => {
    expect(maskDateTime("01/11/2026 08:30")).toBe("01/11/2026 08:30");
    expect(maskDateTime("01-11-2026, 08h30xx99")).toBe("01/11/2026 08:30");
  });

  it("xóa lùi qua dấu phân cách vẫn được", () => {
    expect(maskDateTime("01/")).toBe("01");
    expect(maskDateTime("01/11/2026 ")).toBe("01/11/2026");
  });
});

describe("đổi qua lại giữa hiển thị và giá trị trong form", () => {
  it("đổi giá trị form sang dd/mm/yyyy hh:mm", () => {
    expect(internalToDisplay("2026-11-01T08:30")).toBe("01/11/2026 08:30");
    expect(internalToDisplay("")).toBe("");
    expect(internalToDisplay("01/1")).toBe("01/1");
  });

  it("đổi chuỗi đủ và hợp lệ sang giá trị form", () => {
    expect(displayToInternal("01/11/2026 08:30")).toBe("2026-11-01T08:30");
    expect(displayToInternal("29/02/2028 23:59")).toBe("2028-02-29T23:59");
    expect(displayToInternal("")).toBe("");
  });

  it("giữ nguyên chuỗi dở dang hoặc ngày giờ không có thật để báo lỗi", () => {
    expect(displayToInternal("01/11/2026 08:3")).toBe("01/11/2026 08:3");
    expect(displayToInternal("31/02/2026 08:30")).toBe("31/02/2026 08:30");
    expect(displayToInternal("29/02/2027 08:30")).toBe("29/02/2027 08:30");
    expect(displayToInternal("01/13/2026 08:30")).toBe("01/13/2026 08:30");
    expect(displayToInternal("01/11/2026 24:00")).toBe("01/11/2026 24:00");
    expect(displayToInternal("01/11/2026 08:60")).toBe("01/11/2026 08:60");
  });

  it("đi hai chiều không đổi", () => {
    expect(displayToInternal(internalToDisplay("2026-12-31T23:59"))).toBe("2026-12-31T23:59");
  });
});
