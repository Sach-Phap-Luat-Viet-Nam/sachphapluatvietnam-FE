import { describe, expect, it } from "vitest";
import { preparePolicyHtml } from "./policy-html";

describe("preparePolicyHtml", () => {
  it("splits sections at each h2 and keeps the intro before the first heading", () => {
    const content = preparePolicyHtml(
      [
        "<blockquote><p><strong>Dự thảo.</strong> Chưa có hiệu lực.</p></blockquote>",
        '<h2 id="pham-vi">1. Phạm vi áp dụng</h2><p>Đoạn một.</p><ul><li>Ý A</li></ul>',
        '<h2 id="lien-he">Kênh liên hệ</h2><p>Đoạn hai.</p>',
      ].join("\n"),
    );

    expect(content.intro).toBe("<blockquote><p><strong>Dự thảo.</strong> Chưa có hiệu lực.</p></blockquote>");
    expect(content.sections).toEqual([
      { id: "pham-vi", title: "Phạm vi áp dụng", html: "<p>Đoạn một.</p><ul><li>Ý A</li></ul>" },
      { id: "lien-he", title: "Kênh liên hệ", html: "<p>Đoạn hai.</p>" },
    ]);
  });

  it("returns no intro when content starts with a heading", () => {
    expect(preparePolicyHtml("<h2>Mục</h2><p>x</p>").intro).toBeNull();
  });

  it("generates ids from the title when missing, and de-duplicates them", () => {
    const { sections } = preparePolicyHtml(
      '<h2>Quyền của bạn</h2><p>a</p><h2 id="quyen-cua-ban">Khác</h2><p>b</p><h2 id="Đổi Trả">Đổi trả</h2>',
    );

    expect(sections.map((section) => section.id)).toEqual(["quyen-cua-ban", "quyen-cua-ban-2", "doi-tra"]);
  });

  it("does not reuse ids of the page frame", () => {
    const { sections } = preparePolicyHtml('<h2 id="noi-dung">Nội dung</h2><h2 id="bat-dau">Bắt đầu</h2>');

    expect(sections.map((section) => section.id)).toEqual(["noi-dung-2", "bat-dau-2"]);
  });

  it("decodes entities in titles so React does not double-encode them", () => {
    const { sections } = preparePolicyHtml("<h2>Giao &amp; nhận <em>hàng</em></h2>");

    expect(sections[0]?.title).toBe("Giao & nhận hàng");
  });

  it("demotes h1 to a section heading", () => {
    const { sections } = preparePolicyHtml('<h1 id="tieu-de">Tiêu đề</h1><p>x</p>');

    expect(sections).toEqual([{ id: "tieu-de", title: "Tiêu đề", html: "<p>x</p>" }]);
  });

  it("strips scripts, event handlers, styles and unsafe links", () => {
    const { intro, sections } = preparePolicyHtml(
      [
        '<p onclick="alert(1)" style="color:red">Mở đầu<script>alert(1)</script><img src=x onerror="alert(1)"></p>',
        '<h2 id="x" onmouseover="alert(1)">Mục</h2>',
        '<p><a href="javascript:alert(1)">xấu</a> <a href="//evil.example">khác</a><iframe src="https://evil.example"></iframe></p>',
      ].join(""),
    );

    expect(intro).toBe("<p>Mở đầu</p>");
    expect(sections[0]?.id).toBe("x");
    expect(sections[0]?.html).not.toMatch(/javascript:|evil\.example|iframe|onmouseover/);
  });

  it("opens external links in a new tab and keeps internal links in place", () => {
    const { sections } = preparePolicyHtml(
      '<h2>Liên kết</h2><p><a href="https://zalo.me/0932000035">Zalo</a> <a href="/chinh-sach-bao-mat">Bảo mật</a> <a href="#pham-vi" target="_blank">Mục 1</a></p>',
    );

    expect(sections[0]?.html).toBe(
      '<p><a href="https://zalo.me/0932000035" rel="nofollow noopener noreferrer" target="_blank">Zalo</a> ' +
        '<a href="/chinh-sach-bao-mat">Bảo mật</a> <a href="#pham-vi">Mục 1</a></p>',
    );
  });

  it("keeps sections whose body is empty so the table of contents matches the headings", () => {
    const { sections } = preparePolicyHtml("<h2>Một</h2><h2>Hai</h2><p>x</p>");

    expect(sections).toEqual([
      { id: "mot", title: "Một", html: "" },
      { id: "hai", title: "Hai", html: "<p>x</p>" },
    ]);
  });
});
