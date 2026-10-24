import { SLUG_PATTERN, slugify } from "./slugify";

describe("slugify", () => {
  it("bỏ dấu tiếng Việt và nối bằng gạch", () => {
    expect(slugify("Bộ luật Dân sự 2026")).toBe("bo-luat-dan-su-2026");
    expect(slugify("Đường lối, chính sách đất đai")).toBe("duong-loi-chinh-sach-dat-dai");
  });

  it("gộp ký tự đặc biệt liên tiếp, bỏ gạch ở hai đầu", () => {
    expect(slugify("  Luật -- Thuế (sửa đổi)!  ")).toBe("luat-thue-sua-doi");
    expect(slugify("91/2015/QH13")).toBe("91-2015-qh13");
  });

  it("trả chuỗi rỗng khi không có chữ hoặc số", () => {
    expect(slugify("  --  ")).toBe("");
  });

  it("kết quả khớp quy tắc slug của backend", () => {
    expect(SLUG_PATTERN.test(slugify("Hỏi – đáp Luật Hôn nhân & Gia đình"))).toBe(true);
    expect(SLUG_PATTERN.test("co-dau-ă")).toBe(false);
    expect(SLUG_PATTERN.test("hai--gach")).toBe(false);
  });
});
