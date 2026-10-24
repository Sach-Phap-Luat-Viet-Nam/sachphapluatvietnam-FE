import { loginPath } from "./routes";

describe("loginPath", () => {
  it("kèm trang đang mở để quay lại sau khi đăng nhập", () => {
    expect(loginPath("/kho?page=2")).toBe("/dang-nhap?next=%2Fkho%3Fpage%3D2");
  });

  it("bỏ ?next= khi đang ở trang chủ", () => {
    expect(loginPath("/")).toBe("/dang-nhap");
  });
});
