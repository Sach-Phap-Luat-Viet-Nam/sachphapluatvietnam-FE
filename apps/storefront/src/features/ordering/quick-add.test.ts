import { describe, expect, it } from "vitest";
import { pickQuickAddSku } from "./quick-add";
import type { QuickAddBook } from "./quick-add";

const paperback = { id: 100, coverType: "paperback", salePrice: 150000, inStock: true };
const hardcover = { id: 101, coverType: "hardcover", salePrice: 250000, inStock: true };

function book(edition: Partial<QuickAddBook["editions"][number]>): QuickAddBook {
  return { editions: [{ isLatest: true, status: "on_sale", skus: [hardcover, paperback], ...edition }] };
}

describe("pickQuickAddSku", () => {
  it("picks the cheapest in-stock SKU of the latest edition", () => {
    expect(pickQuickAddSku(book({}))).toEqual({ skuId: 100, coverType: "paperback" });
    expect(pickQuickAddSku(book({ skus: [hardcover, { ...paperback, inStock: false }] }))).toEqual({
      skuId: 101,
      coverType: "hardcover",
    });
  });

  it("ignores older editions", () => {
    const data: QuickAddBook = {
      editions: [
        { isLatest: false, status: "on_sale", skus: [{ ...paperback, id: 7, salePrice: 90000 }] },
        { isLatest: true, status: "clearance", skus: [hardcover] },
      ],
    };
    expect(pickQuickAddSku(data)).toEqual({ skuId: 101, coverType: "hardcover" });
  });

  it("returns null when nothing can be bought", () => {
    expect(pickQuickAddSku(book({ status: "discontinued" }))).toBeNull();
    expect(pickQuickAddSku(book({ skus: [{ ...paperback, inStock: false }] }))).toBeNull();
    expect(pickQuickAddSku({ editions: [] })).toBeNull();
  });
});
