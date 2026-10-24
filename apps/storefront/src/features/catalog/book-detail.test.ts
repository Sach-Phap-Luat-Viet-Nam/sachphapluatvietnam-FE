import { describe, expect, it } from "vitest";
import {
  audienceText,
  bookJsonLd,
  editionHref,
  editionLabel,
  publishingFacts,
  purchaseState,
  safePreviewUrl,
  selectEdition,
  serializeJsonLd,
} from "./book-detail";
import type { BookDetail, Edition } from "./schemas";

function edition(overrides: Partial<Edition> = {}): Edition {
  return {
    id: 10,
    editionName: "Tái bản lần 3",
    isbn: "9780306406157",
    publisher: "NXB Tư pháp",
    publishingDecisionNo: "123/QĐ-NXBTP",
    registrationNo: null,
    publishYear: 2026,
    updatedToText: "Cập nhật đến Bộ luật Dân sự 91/2015/QH13",
    updatedToDate: "2026-07-01",
    pages: 820,
    size: "16x24 cm",
    weightGram: 600,
    coverImageUrl: "https://cdn.example/bia.jpg",
    previewFileUrl: null,
    tableOfContents: null,
    releaseDate: "2026-08-01",
    isLatest: true,
    status: "on_sale",
    skus: [
      {
        id: 100,
        skuCode: "SLVN-BLDS-2026-BM",
        coverType: "paperback",
        listPrice: 200000,
        salePrice: 150000,
        discountPercent: 25,
        allowPreorder: false,
        inStock: true,
      },
    ],
    legalDocuments: [],
    ...overrides,
  };
}

function book(editions: Edition[]): BookDetail {
  return {
    id: 1,
    title: "Bộ luật Dân sự 2026",
    slug: "bo-luat-dan-su-2026",
    description: null,
    bookType: "code",
    targetAudiences: ["student", "lawyer"],
    metaTitle: null,
    metaDescription: null,
    categories: [{ id: 3, name: "Dân sự", slug: "dan-su" }],
    authors: [{ id: 2, name: "Ban biên tập", slug: "ban-bien-tap" }],
    editions,
  };
}

describe("selectEdition", () => {
  const latest = edition({ id: 10 });
  const old = edition({ id: 7, isLatest: false, editionName: "Tái bản lần 2", publishYear: 2024 });
  const detail = book([latest, old]);

  it("picks the edition in ?an-ban= and falls back to the latest one", () => {
    expect(selectEdition(detail, "7")).toBe(old);
    expect(selectEdition(detail, "")).toBe(latest);
    expect(selectEdition(detail, "999")).toBe(latest);
    expect(selectEdition(detail, "7abc")).toBe(latest);
  });

  it("returns null when the book has no edition", () => {
    expect(selectEdition(book([]), "")).toBeNull();
  });

  it("links the latest edition to the canonical URL", () => {
    expect(editionHref(detail.slug, latest)).toBe("/sach/bo-luat-dan-su-2026");
    expect(editionHref(detail.slug, old)).toBe("/sach/bo-luat-dan-su-2026?an-ban=7");
  });
});

describe("editionLabel", () => {
  it("joins the edition name and year, or falls back to the ISBN", () => {
    expect(editionLabel(edition())).toBe("Tái bản lần 3 · 2026");
    expect(editionLabel(edition({ editionName: null, publishYear: null }))).toBe("ISBN 9780306406157");
  });
});

describe("purchaseState", () => {
  it("only lets on_sale and clearance editions with SKUs be bought", () => {
    expect(purchaseState(edition())).toEqual({ buyable: true, label: null });
    expect(purchaseState(edition({ status: "clearance" }))).toEqual({ buyable: true, label: "Đang thanh lý" });
    expect(purchaseState(edition({ skus: [] }))).toEqual({ buyable: false, label: "Chưa có giá bán" });
    expect(purchaseState(edition({ status: "discontinued" }))).toEqual({ buyable: false, label: "Ngừng bán" });
    expect(purchaseState(edition({ status: "upcoming", releaseDate: "2026-12-01" }))).toEqual({
      buyable: false,
      label: "Sắp phát hành, dự kiến 01/12/2026",
    });
  });
});

describe("publishingFacts", () => {
  it("lists only the facts that have data", () => {
    const facts = publishingFacts(edition({ pages: null, size: null }));
    expect(facts.map((fact) => fact.label)).not.toContain("Số trang");
    expect(facts).toContainEqual({ label: "Trọng lượng", value: "600 g" });
    expect(facts).toContainEqual({ label: "Ngày phát hành", value: "01/08/2026" });
  });
});

describe("safePreviewUrl", () => {
  it("accepts https links only", () => {
    expect(safePreviewUrl("https://cdn.example/doc-thu.pdf")).toBe("https://cdn.example/doc-thu.pdf");
    expect(safePreviewUrl("javascript:alert(1)")).toBeNull();
    expect(safePreviewUrl("http://cdn.example/doc-thu.pdf")).toBeNull();
    expect(safePreviewUrl("/doc-thu.pdf")).toBeNull();
  });
});

describe("audienceText", () => {
  it("translates known audiences", () => {
    expect(audienceText(["student", "lawyer", "robot"])).toBe("Sinh viên · Luật sư");
  });
});

describe("bookJsonLd", () => {
  it("describes the book, its offers and the breadcrumb", () => {
    const current = edition();
    const data = bookJsonLd(book([current]), current, "Mô tả ngắn");
    const graph = data["@graph"];
    expect(graph).toEqual([
      expect.objectContaining({
        "@type": ["Book", "Product"],
        name: "Bộ luật Dân sự 2026",
        isbn: "9780306406157",
        description: "Mô tả ngắn",
        author: [{ "@type": "Person", name: "Ban biên tập" }],
        offers: [
          expect.objectContaining({
            price: 150000,
            priceCurrency: "VND",
            availability: "https://schema.org/InStock",
          }),
        ],
      }),
      expect.objectContaining({
        "@type": "BreadcrumbList",
        itemListElement: [
          expect.objectContaining({ position: 1, name: "Trang chủ" }),
          expect.objectContaining({ position: 2, name: "Tủ sách" }),
          expect.objectContaining({ position: 3, name: "Dân sự", item: "/sach?category=dan-su" }),
          expect.objectContaining({ position: 4, name: "Bộ luật Dân sự 2026", item: "/sach/bo-luat-dan-su-2026" }),
        ],
      }),
    ]);
  });

  it("marks out-of-stock and discontinued offers", () => {
    const soldOut = edition({ skus: edition().skus.map((sku) => ({ ...sku, inStock: false })) });
    expect(JSON.stringify(bookJsonLd(book([soldOut]), soldOut, ""))).toContain("https://schema.org/OutOfStock");
    const discontinued = edition({ status: "discontinued" });
    expect(JSON.stringify(bookJsonLd(book([discontinued]), discontinued, ""))).toContain(
      "https://schema.org/Discontinued",
    );
  });

  it("escapes < so the data cannot close the script tag", () => {
    expect(serializeJsonLd({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});
