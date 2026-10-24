import { buyNowHref, buyNowLine, parseBuyNowParams } from "./buy-now";
import type { BuyNowBook } from "./buy-now";

const BOOK: BuyNowBook = {
  title: "Bộ luật Dân sự 2026",
  slug: "bo-luat-dan-su-2026",
  editions: [
    {
      editionName: "Tái bản lần 3",
      coverImageUrl: null,
      status: "on_sale",
      skus: [
        { id: 100, coverType: "paperback", salePrice: 150000, listPrice: 180000, inStock: true },
        { id: 101, coverType: "hardcover", salePrice: 250000, listPrice: 250000, inStock: false },
      ],
    },
    {
      editionName: "Tái bản lần 2",
      coverImageUrl: null,
      status: "discontinued",
      skus: [{ id: 90, coverType: "paperback", salePrice: 120000, listPrice: 120000, inStock: true }],
    },
  ],
};

describe("buy-now link", () => {
  it("round-trips the selection through the checkout URL", () => {
    const href = buyNowHref({ slug: "bo-luat-dan-su-2026", skuId: 100, quantity: 2 });
    expect(href).toBe("/thanh-toan?mua-ngay=bo-luat-dan-su-2026&sku=100&sl=2");
    const params = Object.fromEntries(new URL(href, "https://example.com").searchParams);
    expect(parseBuyNowParams(params)).toEqual({ slug: "bo-luat-dan-su-2026", skuId: 100, quantity: 2 });
  });

  it("is not buy-now mode without the slug, and invalid when the link was tampered with", () => {
    expect(parseBuyNowParams({})).toBeNull();
    expect(parseBuyNowParams({ "mua-ngay": "sach", sku: "100" })).toBe("invalid");
    expect(parseBuyNowParams({ "mua-ngay": "sach", sku: "abc", sl: "1" })).toBe("invalid");
    expect(parseBuyNowParams({ "mua-ngay": "sach", sku: "100", sl: "0" })).toBe("invalid");
    expect(parseBuyNowParams({ "mua-ngay": "sach", sku: "100", sl: "21" })).toBe("invalid");
    expect(parseBuyNowParams({ "mua-ngay": "Sách có dấu", sku: "100", sl: "1" })).toBe("invalid");
  });
});

describe("buyNowLine", () => {
  it("builds the single line with an estimated total", () => {
    expect(buyNowLine(BOOK, { slug: BOOK.slug, skuId: 100, quantity: 3 })).toMatchObject({
      bookTitle: "Bộ luật Dân sự 2026",
      editionName: "Tái bản lần 3",
      coverType: "paperback",
      unitPrice: 150000,
      lineTotal: 450000,
      blocker: null,
    });
  });

  it("explains why an out-of-stock or discontinued SKU cannot be ordered", () => {
    expect(buyNowLine(BOOK, { slug: BOOK.slug, skuId: 101, quantity: 1 })?.blocker).toMatch(/tạm hết hàng/);
    expect(buyNowLine(BOOK, { slug: BOOK.slug, skuId: 90, quantity: 1 })?.blocker).toMatch(/không còn bán/);
  });

  it("returns null when the SKU no longer belongs to the book", () => {
    expect(buyNowLine(BOOK, { slug: BOOK.slug, skuId: 999, quantity: 1 })).toBeNull();
  });
});
