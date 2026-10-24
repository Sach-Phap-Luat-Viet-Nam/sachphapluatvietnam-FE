import { describe, expect, it } from "vitest";
import { descriptionText, sanitizeDescription } from "./description";

describe("sanitizeDescription", () => {
  it("keeps formatting tags and drops scripts, styles and event handlers", () => {
    const html = sanitizeDescription(
      '<h1>Giới thiệu</h1><p onclick="steal()" style="color:red">Bộ luật <strong>mới</strong></p>' +
        "<script>alert(1)</script><img src=x onerror=alert(1)><ul><li>Một</li></ul>",
    );
    expect(html).toBe("<h2>Giới thiệu</h2><p>Bộ luật <strong>mới</strong></p><ul><li>Một</li></ul>");
  });

  it("only keeps http(s) links and opens them safely", () => {
    const unsafe = sanitizeDescription('<p><a href="javascript:alert(1)">x</a></p>');
    expect(unsafe).not.toContain("href");
    expect(unsafe).not.toContain("javascript");
    expect(sanitizeDescription('<p><a href="https://thuvienphapluat.vn">Văn bản</a></p>')).toBe(
      '<p><a href="https://thuvienphapluat.vn" rel="nofollow noopener noreferrer" target="_blank">Văn bản</a></p>',
    );
  });

  it("returns null when nothing readable is left", () => {
    expect(sanitizeDescription(null)).toBeNull();
    expect(sanitizeDescription("<p> </p><script>alert(1)</script>")).toBeNull();
  });
});

describe("descriptionText", () => {
  it("turns HTML into plain text without double-encoding entities", () => {
    expect(descriptionText("<p>Luật Đất đai &amp; Nghị định</p><p>hướng dẫn</p>")).toBe(
      "Luật Đất đai & Nghị định hướng dẫn",
    );
  });

  it("cuts long text at a word boundary", () => {
    const text = descriptionText(`<p>${"Bộ luật dân sự ".repeat(20)}</p>`, 40);
    expect(text.length).toBeLessThanOrEqual(40);
    expect(text.endsWith("…")).toBe(true);
    expect(text).not.toMatch(/\s…$/);
  });
});
