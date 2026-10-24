import { describe, expect, it } from "vitest";
import { descriptionText, formatRichText } from "./description";

describe("formatRichText", () => {
  it("keeps formatting tags and drops scripts, styles and event handlers", () => {
    const html = formatRichText(
      '<h1>Giới thiệu</h1><p onclick="steal()" style="color:red">Bộ luật <strong>mới</strong></p>' +
        "<script>alert(1)</script><img src=x onerror=alert(1)><ul><li>Một</li></ul>",
    );
    expect(html).toBe("<h2>Giới thiệu</h2><p>Bộ luật <strong>mới</strong></p><ul><li>Một</li></ul>");
  });

  it("only keeps http(s) links and opens them safely", () => {
    const unsafe = formatRichText('<p><a href="javascript:alert(1)">x</a></p>');
    expect(unsafe).not.toContain("href");
    expect(unsafe).not.toContain("javascript");
    expect(formatRichText('<p><a href="https://thuvienphapluat.vn">Văn bản</a></p>')).toBe(
      '<p><a href="https://thuvienphapluat.vn" rel="nofollow noopener noreferrer" target="_blank">Văn bản</a></p>',
    );
  });

  it("turns plain text into paragraphs, line breaks and dividers", () => {
    const text =
      "SÁCH: LUẬT ĐẦU TƯ\n\nCuốn sách là tài liệu tra cứu.\n\n-----------------\n\n\n\n" +
      "Cấu trúc nội dung:\n\nPhần 1: Luật Đầu tư\nPhần 2: Luật PPP";
    expect(formatRichText(text)).toBe(
      "<p>SÁCH: LUẬT ĐẦU TƯ</p><p>Cuốn sách là tài liệu tra cứu.</p><hr />" +
        "<p>Cấu trúc nội dung:</p><p>Phần 1: Luật Đầu tư<br />Phần 2: Luật PPP</p>",
    );
  });

  it("escapes characters in plain text instead of treating them as HTML", () => {
    expect(formatRichText("Điều 5 < Điều 6 & Điều 7")).toBe("<p>Điều 5 &lt; Điều 6 &amp; Điều 7</p>");
  });

  it("renders an HTML table of contents", () => {
    expect(formatRichText("<ul><li>Phần thứ nhất</li><li>Phần thứ hai</li></ul>")).toBe(
      "<ul><li>Phần thứ nhất</li><li>Phần thứ hai</li></ul>",
    );
  });

  it("returns null when nothing readable is left", () => {
    expect(formatRichText(null)).toBeNull();
    expect(formatRichText("  \n\n ")).toBeNull();
    expect(formatRichText("<p> </p><script>alert(1)</script>")).toBeNull();
  });
});

describe("descriptionText", () => {
  it("turns HTML into plain text without double-encoding entities", () => {
    expect(descriptionText("<p>Luật Đất đai &amp; Nghị định</p><p>hướng dẫn</p>")).toBe(
      "Luật Đất đai & Nghị định hướng dẫn",
    );
  });

  it("drops plain-text dividers and line breaks", () => {
    expect(descriptionText("Luật Đầu tư\n\n-----------\n\nTại sao bạn cần cuốn sách này?")).toBe(
      "Luật Đầu tư Tại sao bạn cần cuốn sách này?",
    );
  });

  it("cuts long text at a word boundary", () => {
    const text = descriptionText(`<p>${"Bộ luật dân sự ".repeat(20)}</p>`, 40);
    expect(text.length).toBeLessThanOrEqual(40);
    expect(text.endsWith("…")).toBe(true);
    expect(text).not.toMatch(/\s…$/);
  });
});
