import { describe, expect, it } from "vitest";
import { sitemapEntries } from "./sitemap";

describe("sitemapEntries", () => {
  it("lists static pages, books with their cover and combos as absolute URLs", () => {
    const entries = sitemapEntries(
      "https://sachluat.vn",
      [
        { slug: "bo-luat-dan-su-2026", coverImageUrl: "https://cdn.example/bia.jpg" },
        { slug: "luat-dat-dai", coverImageUrl: null },
      ],
      [{ slug: "combo-dan-su" }],
    );
    expect(entries.map((entry) => entry.url)).toEqual([
      "https://sachluat.vn/",
      "https://sachluat.vn/sach",
      "https://sachluat.vn/khuyen-mai",
      "https://sachluat.vn/sach/bo-luat-dan-su-2026",
      "https://sachluat.vn/sach/luat-dat-dai",
      "https://sachluat.vn/combo/combo-dan-su",
    ]);
    expect(entries[3]?.images).toEqual(["https://cdn.example/bia.jpg"]);
    expect(entries[4]?.images).toBeUndefined();
  });
});
