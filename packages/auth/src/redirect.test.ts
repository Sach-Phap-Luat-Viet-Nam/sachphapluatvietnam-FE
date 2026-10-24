import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("giữ path nội bộ kèm query và hash", () => {
    expect(safeNextPath("/sach?q=d%C3%A2n%20s%E1%BB%B1&page=2#ket-qua")).toBe(
      "/sach?q=d%C3%A2n%20s%E1%BB%B1&page=2#ket-qua",
    );
  });

  it.each([null, "", "sach", "https://evil.com", "//evil.com", "/\\evil.com", "/\t/evil.com", "javascript:alert(1)"])(
    "về trang chủ với giá trị không an toàn %j",
    (next) => {
      expect(safeNextPath(next)).toBe("/");
    },
  );

  it("không quay lại chính trang đăng nhập hay đăng ký", () => {
    expect(safeNextPath("/dang-nhap?next=/sach")).toBe("/");
    expect(safeNextPath("/dang-ky?next=/sach")).toBe("/");
  });
});
