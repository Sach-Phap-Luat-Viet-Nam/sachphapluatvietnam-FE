import {
  availableCoverTypes,
  bookToFormValues,
  categoryToFormValues,
  editionToFormValues,
  EMPTY_EDITION_FORM,
  emptyQuickBookForm,
  newEditionFormFrom,
  toBookBody,
  toCategoryBody,
  toEditionBody,
  toQuickBookBody,
  toSkuCreateBody,
} from "./forms";
import {
  bookFormSchema,
  editionFormSchema,
  isValidIsbn13,
  quickBookFormSchema,
  skuCreateFormSchema,
  skuPriceFormSchema,
} from "./schemas";
import type { AdminBook, Edition } from "./schemas";

const EDITION: Edition = {
  id: 10,
  editionName: "Tái bản lần 3 – 2026",
  isbn: "9780306406157",
  publisher: "NXB Tư pháp",
  publishingDecisionNo: "123/QĐ-NXBTP",
  registrationNo: null,
  publishYear: 2026,
  updatedToText: null,
  updatedToDate: "2026-07-01",
  pages: 820,
  size: "16x24 cm",
  weightGram: null,
  coverImageUrl: null,
  previewFileUrl: null,
  tableOfContents: null,
  releaseDate: null,
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
  legalDocuments: [
    {
      id: 5,
      docNumber: "91/2015/QH13",
      docType: "code",
      title: "Bộ luật Dân sự",
      issuedDate: null,
      effectiveDate: null,
    },
  ],
};

const BOOK: AdminBook = {
  id: 1,
  title: "Bộ luật Dân sự 2026",
  slug: "bo-luat-dan-su-2026",
  description: null,
  bookType: "code",
  status: "active",
  targetAudiences: ["student", "unknown_audience"],
  metaTitle: null,
  metaDescription: "Mô tả SEO",
  categories: [{ id: 3, name: "Dân sự", slug: "dan-su" }],
  authors: [{ id: 2, name: "Ban biên tập", slug: "ban-bien-tap" }],
  editions: [EDITION],
  createdAt: "2026-10-23T03:00:00Z",
  updatedAt: "2026-10-23T03:05:00Z",
};

describe("đầu sách", () => {
  it("đổi response thành form rồi thành body, ô trống gửi null", () => {
    const values = bookToFormValues(BOOK);

    expect(values.targetAudiences).toEqual(["student"]);
    expect(toBookBody(values)).toEqual({
      title: "Bộ luật Dân sự 2026",
      slug: "bo-luat-dan-su-2026",
      bookType: "code",
      status: "active",
      description: null,
      targetAudiences: ["student"],
      metaTitle: null,
      metaDescription: "Mô tả SEO",
      categoryIds: [3],
      authorIds: [2],
    });
  });

  it("chặn slug sai quy tắc", () => {
    const result = bookFormSchema.safeParse({ ...bookToFormValues(BOOK), slug: "Bộ-Luật" });
    expect(result.success).toBe(false);
  });
});

describe("ấn bản", () => {
  it("giữ nguyên dữ liệu khi đi qua form", () => {
    const body = toEditionBody(editionToFormValues(EDITION));

    expect(body).toMatchObject({
      isbn: "9780306406157",
      registrationNo: null,
      publishYear: 2026,
      pages: 820,
      weightGram: null,
      updatedToDate: "2026-07-01",
      releaseDate: null,
      legalDocumentIds: [5],
    });
  });

  it("bỏ gạch nối trong ISBN và đổi ô số sang number", () => {
    const body = toEditionBody({ ...EMPTY_EDITION_FORM, isbn: "978-0-306-40615-7", pages: " 120 " });
    expect(body.isbn).toBe("9780306406157");
    expect(body.pages).toBe(120);
    expect(body.publishYear).toBeNull();
  });

  it("kiểm tra năm và số trang", () => {
    const values = { ...editionToFormValues(EDITION), publishYear: "1800", pages: "0" };
    const result = editionFormSchema.safeParse(values);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(["publishYear", "pages"]);
  });
});

describe("isValidIsbn13", () => {
  it.each(["9780306406157", "978-0-306-40615-7", "979 10 90636 07 1"])("nhận %s", (isbn) => {
    expect(isValidIsbn13(isbn)).toBe(true);
  });

  it.each(["9780306406158", "9770306406157", "978030640615", ""])("từ chối %j", (isbn) => {
    expect(isValidIsbn13(isbn)).toBe(false);
  });
});

describe("SKU", () => {
  it("giá bán không vượt giá bìa", () => {
    const result = skuPriceFormSchema.safeParse({ listPrice: "100000", salePrice: "120000", allowPreorder: false });
    expect(result.error?.issues).toMatchObject([{ path: ["salePrice"] }]);
  });

  it("giá là số nguyên dương, không có dấu chấm", () => {
    expect(skuPriceFormSchema.safeParse({ listPrice: "150.000", salePrice: "1", allowPreorder: false }).success).toBe(
      false,
    );
  });

  it("chuyển mã SKU sang chữ in hoa", () => {
    const values = skuCreateFormSchema.parse({
      skuCode: " slvn-blds-2026-bc ",
      coverType: "hardcover",
      listPrice: "250000",
      salePrice: "250000",
      allowPreorder: true,
    });
    expect(toSkuCreateBody(values)).toEqual({
      skuCode: "SLVN-BLDS-2026-BC",
      coverType: "hardcover",
      listPrice: 250000,
      salePrice: 250000,
      allowPreorder: true,
    });
  });

  it("chỉ gợi ý loại bìa chưa có SKU", () => {
    expect(availableCoverTypes(EDITION)).toEqual(["hardcover"]);
  });
});

describe("danh mục", () => {
  it("danh mục gốc gửi parentId null", () => {
    const values = categoryToFormValues({ id: 3, name: "Dân sự", slug: "dan-su", parentId: null, sortOrder: 1 });
    expect(values.parentId).toBe("");
    expect(toCategoryBody({ ...values, parentId: "" }).parentId).toBeNull();
    expect(toCategoryBody({ ...values, parentId: "7" })).toEqual({
      name: "Dân sự",
      slug: "dan-su",
      parentId: 7,
      sortOrder: 1,
    });
  });
});

describe("tạo nhanh sách", () => {
  const filled = {
    ...emptyQuickBookForm(2026, "NXB Tài Chính"),
    title: "  Luật Quản lý nợ công ",
    slug: "luat-quan-ly-no-cong",
    isbn: "978-0-306-40615-7",
    publishingDecisionNo: "123/QĐ-NXBTC",
    skus: [
      {
        skuCode: "pl250-bm",
        coverType: "paperback" as const,
        listPrice: "250000",
        salePrice: "199000",
        allowPreorder: false,
      },
    ],
  };

  it("form mặc định: một SKU bìa mềm, đăng bán ngay, năm nay, nhà xuất bản lần trước", () => {
    expect(emptyQuickBookForm(2026, "NXB A")).toMatchObject({
      publishYear: "2026",
      publisher: "NXB A",
      publishNow: true,
      skus: [{ coverType: "paperback", skuCode: "", listPrice: "", salePrice: "" }],
    });
  });

  it("nhận form hợp lệ", () => {
    expect(quickBookFormSchema.safeParse(filled).success).toBe(true);
  });

  it("dùng lại quy tắc của form riêng lẻ: ISBN, giá bán không vượt giá bìa", () => {
    const result = quickBookFormSchema.safeParse({
      ...filled,
      isbn: "123",
      skus: [{ ...filled.skus[0], salePrice: "300000" }],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining(["isbn", "skus.0.salePrice"]),
    );
  });

  it("chặn hai SKU cùng loại bìa hoặc cùng mã (không phân biệt hoa thường)", () => {
    const sku = filled.skus[0];
    const result = quickBookFormSchema.safeParse({ ...filled, skus: [sku, { ...sku, skuCode: "PL250-BM" }] });

    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining(["skus.1.coverType", "skus.1.skuCode"]),
    );
  });

  it("đăng bán ngay thì sách active, ấn bản on_sale; bỏ chọn thì cả hai là nháp", () => {
    const published = toQuickBookBody(filled);
    const draft = toQuickBookBody({ ...filled, publishNow: false });

    expect([published.book.status, published.edition.status]).toEqual(["active", "on_sale"]);
    expect([draft.book.status, draft.edition.status]).toEqual(["draft", "draft"]);
  });

  it("body gồm đủ ba phần, ISBN liền, mã SKU in hoa, ô không có trong form nhanh để trống", () => {
    const body = toQuickBookBody(filled);

    expect(body.book).toMatchObject({
      title: "Luật Quản lý nợ công",
      description: null,
      categoryIds: [],
      authorIds: [],
    });
    expect(body.edition).toMatchObject({
      isbn: "9780306406157",
      publisher: "NXB Tài Chính",
      publishYear: 2026,
      tableOfContents: null,
      legalDocumentIds: [],
    });
    expect(body.skus).toEqual([
      { skuCode: "PL250-BM", coverType: "paperback", listPrice: 250000, salePrice: 199000, allowPreorder: false },
    ]);
  });
});

describe("newEditionFormFrom", () => {
  it("điền sẵn từ ấn bản trước nhưng để trống các ô riêng của ấn bản mới", () => {
    const form = newEditionFormFrom(
      { ...EDITION, legalDocuments: [{ id: 5, docNumber: "91/2015/QH13", title: "Bộ luật Dân sự" } as never] },
      2027,
    );

    expect(form).toMatchObject({
      publisher: "NXB Tư pháp",
      size: "16x24 cm",
      pages: "820",
      publishYear: "2027",
      status: "draft",
      legalDocuments: [{ id: 5, label: "91/2015/QH13 – Bộ luật Dân sự" }],
    });
    expect([form.isbn, form.publishingDecisionNo, form.editionName, form.coverImageUrl, form.releaseDate]).toEqual([
      "",
      "",
      "",
      "",
      "",
    ]);
  });
});
