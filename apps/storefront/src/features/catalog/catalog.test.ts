import { describe, expect, it } from "vitest";
import {
  PAGE_SIZE,
  availabilityLabel,
  catalogHref,
  currentPage,
  flattenCategories,
  pageCount,
  pageWindow,
  toBooksQuery,
} from "./catalog";

describe("toBooksQuery", () => {
  it("maps page filters to the books API query", () => {
    expect(
      toBooksQuery({
        q: "  dân sự ",
        category: "dan-su",
        type: "code",
        cover: "hardcover",
        minPrice: "100000",
        maxPrice: "200000",
        sort: "price_asc",
        page: "2",
      }),
    ).toEqual({
      Q: "dân sự",
      Category: "dan-su",
      Type: "code",
      Cover: "hardcover",
      MinPrice: 100000,
      MaxPrice: 200000,
      Sort: "price_asc",
      Page: 2,
      Limit: PAGE_SIZE,
    });
  });

  it("drops values the backend would reject", () => {
    expect(
      toBooksQuery({ type: "xyz", cover: "leather", sort: "bad", minPrice: "-5", maxPrice: "abc", q: "   " }),
    ).toEqual({ Page: 1, Limit: PAGE_SIZE });
  });

  it("swaps a reversed price range and caps the search length", () => {
    const query = toBooksQuery({ minPrice: "500000", maxPrice: "100000", q: "a".repeat(250) });
    expect(query).toMatchObject({ MinPrice: 100000, MaxPrice: 500000 });
    expect(query.Q).toHaveLength(200);
  });

  it("ignores repeated query keys", () => {
    expect(toBooksQuery({ category: ["dan-su", "hinh-su"] })).toEqual({ Page: 1, Limit: PAGE_SIZE });
  });
});

describe("pagination", () => {
  it("falls back to page 1 for invalid pages", () => {
    expect(currentPage({ page: "NaN" })).toBe(1);
    expect(currentPage({ page: "-3" })).toBe(1);
    expect(currentPage({ page: "0" })).toBe(1);
    expect(currentPage({ page: "1.5" })).toBe(1);
    expect(currentPage({ page: "4" })).toBe(4);
  });

  it("counts pages from the API meta", () => {
    expect(pageCount(0, 24)).toBe(1);
    expect(pageCount(48, 24)).toBe(2);
    expect(pageCount(49, 24)).toBe(3);
  });

  it("shows a window of pages around the current one", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(1, 10)).toEqual([1, 2, 3]);
    expect(pageWindow(5, 10)).toEqual([3, 4, 5, 6, 7]);
    expect(pageWindow(10, 10)).toEqual([8, 9, 10]);
  });

  it("preserves filters when changing page", () => {
    expect(catalogHref({ category: "dan-su", q: "dân sự", page: "1" }, { page: "2" })).toContain("category=dan-su");
    expect(catalogHref({ q: "test" }, { q: "" })).toBe("/sach");
  });
});

describe("flattenCategories", () => {
  it("keeps tree order and depth", () => {
    const tree = [
      {
        id: 1,
        name: "Dân sự",
        slug: "dan-su",
        children: [{ id: 2, name: "Hợp đồng", slug: "hop-dong", children: [] }],
      },
      { id: 3, name: "Hình sự", slug: "hinh-su", children: [] },
    ];
    expect(flattenCategories(tree)).toEqual([
      { slug: "dan-su", name: "Dân sự", depth: 0 },
      { slug: "hop-dong", name: "Hợp đồng", depth: 1 },
      { slug: "hinh-su", name: "Hình sự", depth: 0 },
    ]);
  });
});

describe("availabilityLabel", () => {
  it("prefers edition status, then price, then stock", () => {
    expect(availabilityLabel({ editionStatus: "upcoming", salePrice: 100000, inStock: true })).toBe("Sắp phát hành");
    expect(availabilityLabel({ editionStatus: "discontinued", salePrice: 100000, inStock: true })).toBe("Ngừng bán");
    expect(availabilityLabel({ editionStatus: "on_sale", salePrice: null, inStock: false })).toBe("Chưa có giá bán");
    expect(availabilityLabel({ editionStatus: "on_sale", salePrice: 100000, inStock: false })).toBe("Tạm hết hàng");
    expect(availabilityLabel({ editionStatus: "clearance", salePrice: 100000, inStock: true })).toBe("Còn hàng");
  });
});
