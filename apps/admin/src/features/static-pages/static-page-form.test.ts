import { htmlHasText, staticPageFormSchema } from "./schemas";
import { storefrontPageUrl } from "./storefront-url";
import { suggestSlug, toStaticPageBody, withHeadingIds } from "./static-page-form";

describe("withHeadingIds", () => {
  it("keeps valid ids so existing #links keep working", () => {
    expect(withHeadingIds('<h2 id="pham-vi">Phạm vi đã sửa</h2><p>x</p>')).toBe(
      '<h2 id="pham-vi">Phạm vi đã sửa</h2><p>x</p>',
    );
  });

  it("generates ids from the heading text and de-duplicates them", () => {
    expect(withHeadingIds('<h2>Quyền của bạn</h2><h2>Quyền của bạn</h2><h2 id="Đổi Trả">Đổi trả</h2>')).toBe(
      '<h2 id="quyen-cua-ban">Quyền của bạn</h2><h2 id="quyen-cua-ban-2">Quyền của bạn</h2><h2 id="doi-tra">Đổi trả</h2>',
    );
  });

  it("avoids ids used by the storefront page frame", () => {
    expect(withHeadingIds("<h2>Nội dung</h2>")).toBe('<h2 id="noi-dung-2">Nội dung</h2>');
  });

  it("leaves content without h2 untouched", () => {
    expect(withHeadingIds("<p>Chỉ có đoạn văn</p><h3>Phụ</h3>")).toBe("<p>Chỉ có đoạn văn</p><h3>Phụ</h3>");
  });
});

describe("toStaticPageBody", () => {
  it("trims fields, turns an empty description into null and adds heading ids", () => {
    expect(
      toStaticPageBody({
        title: "  Chính sách\nđổi trả ",
        slug: " chinh-sach-doi-tra ",
        description: "   ",
        contentHtml: "<h2>Điều kiện</h2><p>Trong 7 ngày.</p>",
        isPublished: true,
      }),
    ).toEqual({
      title: "Chính sách đổi trả",
      slug: "chinh-sach-doi-tra",
      description: null,
      contentHtml: '<h2 id="dieu-kien">Điều kiện</h2><p>Trong 7 ngày.</p>',
      isPublished: true,
    });
  });
});

describe("staticPageFormSchema", () => {
  const valid = {
    title: "Chính sách đổi trả",
    slug: "chinh-sach-doi-tra",
    description: "",
    contentHtml: "<p>Nội dung</p>",
    isPublished: false,
  };

  it("accepts a valid page", () => {
    expect(staticPageFormSchema.safeParse(valid).success).toBe(true);
  });

  it.each(["Chinh-Sach", "chính-sách", "chinh sach", "chinh--sach", "-chinh"])("rejects slug %s", (slug) => {
    expect(staticPageFormSchema.safeParse({ ...valid, slug }).success).toBe(false);
  });

  it("rejects editor output without text", () => {
    expect(staticPageFormSchema.safeParse({ ...valid, contentHtml: "<p></p><p>&nbsp;</p>" }).success).toBe(false);
  });
});

describe("helpers", () => {
  it("htmlHasText ignores tags and non-breaking spaces", () => {
    expect(htmlHasText("<p> </p>")).toBe(false);
    expect(htmlHasText("<h2>Mục</h2>")).toBe(true);
  });

  it("suggestSlug follows backend rules and limit", () => {
    expect(suggestSlug("Hướng dẫn mua hàng!", 100)).toBe("huong-dan-mua-hang");
    expect(suggestSlug("Chính sách bảo mật", 12)).toBe("chinh-sach-b");
    expect(suggestSlug("Chính sách bảo mật", 11)).toBe("chinh-sach");
  });

  it("storefrontPageUrl only links slugs the storefront serves", () => {
    expect(storefrontPageUrl("chinh-sach-bao-mat", "https://shop.vn")).toBe("https://shop.vn/chinh-sach-bao-mat");
    expect(storefrontPageUrl("faq", "https://shop.vn")).toBeNull();
    expect(storefrontPageUrl("chinh-sach-bao-mat", null)).toBeNull();
  });
});
