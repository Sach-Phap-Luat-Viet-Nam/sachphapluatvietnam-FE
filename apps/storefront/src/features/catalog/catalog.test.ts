import { describe, expect, it } from "vitest";
import {
  ON_SALE_VALUE,
  PAGE_SIZE,
  PRICE_RANGES,
  activeFilters,
  authorHref,
  availability,
  catalogHref,
  currentPage,
  flattenCategories,
  isPriceRangeActive,
  legalDocumentHref,
  nextSuggestionIndex,
  pageCount,
  pageWindow,
  priceRangeHref,
  rootCategorySlug,
  subcategoryGroup,
  suggestionTerm,
  toBooksQuery,
  withoutBook,
} from "./catalog";

describe("toBooksQuery", () => {
  it("maps page filters to the books API query", () => {
    expect(
      toBooksQuery({
        q: "  dân sự ",
        category: "dan-su",
        type: "code",
        minPrice: "100000",
        maxPrice: "200000",
        sort: "price_asc",
        page: "2",
      }),
    ).toEqual({
      Q: "dân sự",
      Category: "dan-su",
      Type: "code",
      MinPrice: 100000,
      MaxPrice: 200000,
      Sort: "price_asc",
      Page: 2,
      Limit: PAGE_SIZE,
    });
  });

  it("drops values the backend would reject", () => {
    expect(toBooksQuery({ type: "xyz", sort: "bad", minPrice: "-5", maxPrice: "abc", q: "   " })).toEqual({
      Page: 1,
      Limit: PAGE_SIZE,
    });
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

describe("availability", () => {
  it("prefers edition status, then price, then stock", () => {
    expect(availability({ editionStatus: "upcoming", salePrice: 100000, inStock: true })).toEqual({
      label: "Sắp phát hành",
      tone: "upcoming",
    });
    expect(availability({ editionStatus: "discontinued", salePrice: 100000, inStock: true }).label).toBe("Ngừng bán");
    expect(availability({ editionStatus: "on_sale", salePrice: null, inStock: false }).label).toBe("Chưa có giá bán");
    expect(availability({ editionStatus: "on_sale", salePrice: 100000, inStock: false })).toEqual({
      label: "Tạm hết hàng",
      tone: "muted",
    });
    expect(availability({ editionStatus: "clearance", salePrice: 100000, inStock: true })).toEqual({
      label: "Còn hàng",
      tone: "ok",
    });
  });
});

const tree = [
  {
    id: 1,
    name: "Dân sự",
    slug: "dan-su",
    children: [
      { id: 2, name: "Hợp đồng", slug: "hop-dong", children: [] },
      { id: 4, name: "Thừa kế", slug: "thua-ke", children: [] },
    ],
  },
  { id: 3, name: "Hình sự", slug: "hinh-su", children: [] },
];

describe("price ranges", () => {
  const [, middle, top] = PRICE_RANGES;
  it("links to a range and resets the page", () => {
    expect(middle && priceRangeHref({ q: "luật", page: "3" }, middle)).toBe(
      "/sach?q=lu%E1%BA%ADt&minPrice=150000&maxPrice=300000",
    );
    expect(top && priceRangeHref({ maxPrice: "100" }, top)).toBe("/sach?minPrice=300000");
  });
  it("detects the active range after normalising the query", () => {
    expect(middle && isPriceRangeActive({ minPrice: "300000", maxPrice: "150000" }, middle)).toBe(true);
    expect(top && isPriceRangeActive({ minPrice: "300000", maxPrice: "500000" }, top)).toBe(false);
  });
});

describe("activeFilters", () => {
  it("lists normalised filters with links that remove only that filter", () => {
    const filters = activeFilters(
      { q: " dân sự ", category: "hop-dong", type: "code", minPrice: "150000", page: "2" },
      flattenCategories(tree),
    );
    expect(filters.map((filter) => [filter.key, filter.label])).toEqual([
      ["category", "Hợp đồng"],
      ["type", "Bộ luật"],
      ["price", "Từ 150.000 ₫"],
      ["q", "“dân sự”"],
    ]);
    const type = filters.find((filter) => filter.key === "type");
    expect(type?.removeHref).toBe("/sach?q=+d%C3%A2n+s%E1%BB%B1+&category=hop-dong&minPrice=150000");
  });
  it("removes both price bounds together and falls back to the slug for unknown categories", () => {
    const filters = activeFilters({ category: "khong-co", minPrice: "100000", maxPrice: "200000" }, []);
    expect(filters[0]?.label).toBe("khong-co");
    expect(filters[1]).toEqual({ key: "price", label: "100.000 ₫ – 200.000 ₫", removeHref: "/sach?category=khong-co" });
  });
});

describe("category tree helpers", () => {
  it("shows children of an active root and siblings of an active child", () => {
    expect(subcategoryGroup(tree, "dan-su")?.items.map((item) => [item.slug, item.active])).toEqual([
      ["hop-dong", false],
      ["thua-ke", false],
    ]);
    expect(subcategoryGroup(tree, "thua-ke")).toMatchObject({
      parent: { slug: "dan-su" },
      items: [
        { slug: "hop-dong", active: false },
        { slug: "thua-ke", active: true },
      ],
    });
    expect(subcategoryGroup(tree, "hinh-su")).toBeNull();
    expect(subcategoryGroup(tree, "")).toBeNull();
  });
  it("finds the root of a nested category", () => {
    expect(rootCategorySlug(tree, "thua-ke")).toBe("dan-su");
    expect(rootCategorySlug(tree, "hinh-su")).toBe("hinh-su");
    expect(rootCategorySlug(tree, "khong-co")).toBeUndefined();
  });
});

describe("onSale and legalDocument filters", () => {
  it("maps both filters to the books API query", () => {
    expect(toBooksQuery({ onSale: ON_SALE_VALUE, legalDocument: " 91/2015/QH13 " })).toMatchObject({
      OnSale: true,
      LegalDocument: "91/2015/QH13",
    });
    expect(toBooksQuery({ onSale: "true" }).OnSale).toBe(true);
  });

  it("drops values the backend would reject", () => {
    const query = toBooksQuery({ onSale: "yes", legalDocument: "x".repeat(51) });
    expect(query).toEqual({ Page: 1, Limit: PAGE_SIZE });
  });

  it("lists both as active filters", () => {
    const filters = activeFilters({ onSale: "1", legalDocument: "91/2015/QH13" }, []);
    expect(filters).toEqual([
      { key: "onSale", label: "Đang giảm giá", removeHref: "/sach?legalDocument=91%2F2015%2FQH13" },
      { key: "legalDocument", label: "Văn bản 91/2015/QH13", removeHref: "/sach?onSale=1" },
    ]);
  });

  it("builds a catalog link for a legal document number", () => {
    expect(legalDocumentHref("91/2015/QH13")).toBe("/sach?legalDocument=91%2F2015%2FQH13");
  });
});

describe("search suggestions", () => {
  it("only suggests for trimmed terms of at least two characters", () => {
    expect(suggestionTerm("  d ")).toBeNull();
    expect(suggestionTerm("  dân sự ")).toBe("dân sự");
    expect(suggestionTerm("a".repeat(250))).toHaveLength(200);
  });

  it("cycles through suggestions and back to the input", () => {
    expect(nextSuggestionIndex(-1, 1, 3)).toBe(0);
    expect(nextSuggestionIndex(2, 1, 3)).toBe(-1);
    expect(nextSuggestionIndex(-1, -1, 3)).toBe(2);
    expect(nextSuggestionIndex(0, -1, 3)).toBe(-1);
    expect(nextSuggestionIndex(-1, 1, 0)).toBe(-1);
  });
});

describe("withoutBook", () => {
  it("drops the current book and caps the list", () => {
    const books = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    expect(withoutBook(books, 2, 2)).toEqual([{ id: 1 }, { id: 3 }]);
  });
});

describe("author filter", () => {
  it("passes a valid author slug and drops anything else", () => {
    expect(toBooksQuery({ author: " ban-bien-tap " }).Author).toBe("ban-bien-tap");
    expect(toBooksQuery({ author: "Ban Biên Tập" }).Author).toBeUndefined();
  });

  it("shows the author name when known, else the slug", () => {
    expect(activeFilters({ author: "ban-bien-tap" }, [], "Ban biên tập")).toEqual([
      { key: "author", label: "Tác giả: Ban biên tập", removeHref: "/sach" },
    ]);
    expect(activeFilters({ author: "ban-bien-tap" }, [])[0]?.label).toBe("Tác giả: ban-bien-tap");
    expect(authorHref("ban-bien-tap")).toBe("/sach?author=ban-bien-tap");
  });
});
