import { describe, expect, it } from "vitest";
import { catalogHref, getDemoCatalog } from "./catalog";

describe("demo catalog", () => {
  it("combines search, category, cover and price filters", () => {
    const result = getDemoCatalog({
      q: "dân sự",
      category: "dan-su",
      cover: "hardcover",
      minPrice: "100000",
      maxPrice: "200000",
    });
    expect(result.total).toBe(1);
    expect(result.items[0]?.id).toBe(1);
  });
  it("sorts by price and returns the requested page", () => {
    const result = getDemoCatalog({ sort: "price_asc", page: "2" });
    expect(result.items.map((book) => book.salePrice)).toEqual([216000, 360000]);
    expect(result.pageCount).toBe(2);
  });
  it("handles empty results and clamps invalid pages", () => {
    expect(getDemoCatalog({ q: "không tồn tại", page: "999" })).toMatchObject({ total: 0, page: 1, items: [] });
    expect(getDemoCatalog({ page: "NaN" }).page).toBe(1);
    expect(getDemoCatalog({ page: "-3" }).page).toBe(1);
  });
  it("preserves filters when changing page", () => {
    expect(catalogHref({ category: "dan-su", q: "dân sự", page: "1" }, { page: "2" })).toContain("category=dan-su");
    expect(catalogHref({ q: "test" }, { q: "" })).toBe("/sach");
  });
});
