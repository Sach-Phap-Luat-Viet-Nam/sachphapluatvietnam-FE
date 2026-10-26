import {
  BOOK_STATUSES,
  BOOK_TYPES,
  COVER_TYPES,
  EDITION_STATUSES,
  LEGAL_DOCUMENT_TYPES,
  TARGET_AUDIENCES,
} from "./labels";
import type { BookStatus, BookType, EditionStatus, LegalDocumentType, TargetAudience } from "./labels";
import type {
  AdminBook,
  Author,
  AuthorFormValues,
  BookFormValues,
  Category,
  CategoryFormValues,
  Edition,
  EditionFormValues,
  QuickBookFormValues,
  LegalDocument,
  LegalDocumentFormValues,
  Sku,
  SkuCreateFormValues,
  SkuPriceFormValues,
} from "./schemas";

// Chuyển giữa giá trị form (chuỗi như trong `<input>`) và body gửi backend. Ô để trống gửi `null`.

function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

function isOneOf<Value extends string>(values: readonly Value[], value: string): value is Value {
  return values.some((item) => item === value);
}

/** Giá trị enum từ backend; giá trị lạ (backend thêm mới) thì dùng giá trị mặc định của form. */
function oneOf<Value extends string>(values: readonly Value[], value: string, fallback: Value): Value {
  return isOneOf(values, value) ? value : fallback;
}

// Đầu sách

export const EMPTY_BOOK_FORM: BookFormValues = {
  title: "",
  slug: "",
  bookType: "code",
  status: "draft",
  description: "",
  targetAudiences: [],
  metaTitle: "",
  metaDescription: "",
  categoryIds: [],
  authors: [],
};

export function bookToFormValues(book: AdminBook): BookFormValues {
  return {
    title: book.title,
    slug: book.slug,
    bookType: oneOf<BookType>(BOOK_TYPES, book.bookType, "code"),
    status: oneOf<BookStatus>(BOOK_STATUSES, book.status, "draft"),
    description: book.description ?? "",
    targetAudiences: book.targetAudiences.filter((value): value is TargetAudience => isOneOf(TARGET_AUDIENCES, value)),
    metaTitle: book.metaTitle ?? "",
    metaDescription: book.metaDescription ?? "",
    categoryIds: book.categories.map((category) => category.id),
    authors: book.authors.map((author) => ({ id: author.id, label: author.name })),
  };
}

/** Body `UpsertBookRequest`. `PUT` thay thế toàn bộ nên luôn gửi đủ danh mục, tác giả. */
export function toBookBody(values: BookFormValues) {
  return {
    title: values.title.trim(),
    slug: values.slug.trim(),
    bookType: values.bookType,
    status: values.status,
    description: textOrNull(values.description),
    targetAudiences: values.targetAudiences,
    metaTitle: textOrNull(values.metaTitle),
    metaDescription: textOrNull(values.metaDescription),
    categoryIds: values.categoryIds,
    authorIds: values.authors.map((author) => author.id),
  };
}
export type BookBody = ReturnType<typeof toBookBody>;

// Ấn bản

export const EMPTY_EDITION_FORM: EditionFormValues = {
  isbn: "",
  publisher: "",
  publishingDecisionNo: "",
  status: "draft",
  registrationNo: "",
  editionName: "",
  publishYear: "",
  updatedToText: "",
  updatedToDate: "",
  pages: "",
  size: "",
  weightGram: "",
  coverImageUrl: "",
  previewFileUrl: "",
  tableOfContents: "",
  releaseDate: "",
  legalDocuments: [],
};

function numberText(value: number | null): string {
  return value === null ? "" : String(value);
}

export function legalDocumentLabel(document: Pick<LegalDocument, "docNumber" | "title">): string {
  return `${document.docNumber} – ${document.title}`;
}

export function editionToFormValues(edition: Edition): EditionFormValues {
  return {
    isbn: edition.isbn,
    publisher: edition.publisher,
    publishingDecisionNo: edition.publishingDecisionNo,
    status: oneOf<EditionStatus>(EDITION_STATUSES, edition.status, "draft"),
    registrationNo: edition.registrationNo ?? "",
    editionName: edition.editionName ?? "",
    publishYear: numberText(edition.publishYear),
    updatedToText: edition.updatedToText ?? "",
    updatedToDate: edition.updatedToDate ?? "",
    pages: numberText(edition.pages),
    size: edition.size ?? "",
    weightGram: numberText(edition.weightGram),
    coverImageUrl: edition.coverImageUrl ?? "",
    previewFileUrl: edition.previewFileUrl ?? "",
    tableOfContents: edition.tableOfContents ?? "",
    releaseDate: edition.releaseDate ?? "",
    legalDocuments: edition.legalDocuments.map((document) => ({
      id: document.id,
      label: legalDocumentLabel(document),
    })),
  };
}

/**
 * Form ấn bản mới (tái bản) điền sẵn từ ấn bản trước: giữ nhà xuất bản, khổ, số trang, khối lượng và văn bản pháp luật;
 * để trống ISBN, QĐXB, tên ấn bản, ngày phát hành, ảnh bìa vì mỗi ấn bản một khác. Năm xuất bản là năm nay, trạng thái nháp.
 */
export function newEditionFormFrom(previous: Edition, year: number): EditionFormValues {
  return {
    ...EMPTY_EDITION_FORM,
    publisher: previous.publisher,
    size: previous.size ?? "",
    pages: numberText(previous.pages),
    weightGram: numberText(previous.weightGram),
    publishYear: String(year),
    legalDocuments: previous.legalDocuments.map((document) => ({
      id: document.id,
      label: legalDocumentLabel(document),
    })),
  };
}

/** Body `UpsertEditionRequest`; ISBN gửi dạng 13 số liền. */
export function toEditionBody(values: EditionFormValues) {
  return {
    isbn: values.isbn.replace(/[\s-]/g, ""),
    publisher: values.publisher.trim(),
    publishingDecisionNo: values.publishingDecisionNo.trim(),
    status: values.status,
    registrationNo: textOrNull(values.registrationNo),
    editionName: textOrNull(values.editionName),
    publishYear: numberOrNull(values.publishYear),
    updatedToText: textOrNull(values.updatedToText),
    updatedToDate: textOrNull(values.updatedToDate),
    pages: numberOrNull(values.pages),
    size: textOrNull(values.size),
    weightGram: numberOrNull(values.weightGram),
    coverImageUrl: textOrNull(values.coverImageUrl),
    previewFileUrl: textOrNull(values.previewFileUrl),
    tableOfContents: textOrNull(values.tableOfContents),
    releaseDate: textOrNull(values.releaseDate),
    legalDocumentIds: values.legalDocuments.map((document) => document.id),
  };
}
export type EditionBody = ReturnType<typeof toEditionBody>;

// SKU

export const EMPTY_SKU_FORM: SkuCreateFormValues = {
  skuCode: "",
  coverType: "paperback",
  listPrice: "",
  salePrice: "",
  allowPreorder: false,
};

/** Loại bìa chưa có SKU trong ấn bản (mỗi ấn bản tối đa một SKU mỗi loại bìa). */
export function availableCoverTypes(edition: Pick<Edition, "skus">) {
  return COVER_TYPES.filter((cover) => !edition.skus.some((sku) => sku.coverType === cover));
}

export function skuToPriceValues(sku: Sku): SkuPriceFormValues {
  return { listPrice: String(sku.listPrice), salePrice: String(sku.salePrice), allowPreorder: sku.allowPreorder };
}

export function toSkuPriceBody(values: SkuPriceFormValues) {
  return {
    listPrice: Number(values.listPrice),
    salePrice: Number(values.salePrice),
    allowPreorder: values.allowPreorder,
  };
}

/** Body `CreateSkuRequest`; mã SKU chuyển chữ in hoa như backend. */
export function toSkuCreateBody(values: SkuCreateFormValues) {
  return { skuCode: values.skuCode.trim().toUpperCase(), coverType: values.coverType, ...toSkuPriceBody(values) };
}
export type SkuCreateBody = ReturnType<typeof toSkuCreateBody>;

// Tạo nhanh sách

/** Form "Tạo nhanh": một SKU bìa mềm, đăng bán ngay; năm xuất bản mặc định là năm nay, nhà xuất bản là lần nhập trước. */
export function emptyQuickBookForm(year: number, publisher = ""): QuickBookFormValues {
  return {
    title: "",
    slug: "",
    bookType: "code",
    categoryIds: [],
    authors: [],
    isbn: "",
    publisher,
    publishingDecisionNo: "",
    editionName: "",
    publishYear: String(year),
    pages: "",
    weightGram: "",
    coverImageUrl: "",
    publishNow: true,
    skus: [{ ...EMPTY_SKU_FORM }],
  };
}

/**
 * Body `POST /admin/books/quick`: ba phần như API riêng lẻ. Các ô không có trong form nhanh (mô tả, SEO, mục lục, ...) để
 * trống, sửa sau ở màn chi tiết sách. Bỏ chọn "đăng bán ngay" thì cả đầu sách lẫn ấn bản ở "Nháp".
 */
export function toQuickBookBody(values: QuickBookFormValues) {
  const published = values.publishNow;
  return {
    book: toBookBody({
      ...EMPTY_BOOK_FORM,
      title: values.title,
      slug: values.slug,
      bookType: values.bookType,
      status: published ? "active" : "draft",
      categoryIds: values.categoryIds,
      authors: values.authors,
    }),
    edition: toEditionBody({
      ...EMPTY_EDITION_FORM,
      isbn: values.isbn,
      publisher: values.publisher,
      publishingDecisionNo: values.publishingDecisionNo,
      status: published ? "on_sale" : "draft",
      editionName: values.editionName,
      publishYear: values.publishYear,
      pages: values.pages,
      weightGram: values.weightGram,
      coverImageUrl: values.coverImageUrl,
    }),
    skus: values.skus.map(toSkuCreateBody),
  };
}
export type QuickBookBody = ReturnType<typeof toQuickBookBody>;

// Danh mục, tác giả, văn bản pháp luật

export const EMPTY_CATEGORY_FORM: CategoryFormValues = { name: "", slug: "", parentId: "", sortOrder: "0" };

export function categoryToFormValues(category: Category): CategoryFormValues {
  return {
    name: category.name,
    slug: category.slug,
    parentId: category.parentId === null ? "" : String(category.parentId),
    sortOrder: String(category.sortOrder),
  };
}

export function toCategoryBody(values: CategoryFormValues) {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    parentId: numberOrNull(values.parentId),
    sortOrder: Number(values.sortOrder),
  };
}

export const EMPTY_AUTHOR_FORM: AuthorFormValues = { name: "", slug: "", biography: "", sortOrder: "0" };

export function authorToFormValues(author: Author): AuthorFormValues {
  return {
    name: author.name,
    slug: author.slug,
    biography: author.biography ?? "",
    sortOrder: String(author.sortOrder),
  };
}

export function toAuthorBody(values: AuthorFormValues) {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    biography: textOrNull(values.biography),
    sortOrder: Number(values.sortOrder),
  };
}

export const EMPTY_LEGAL_DOCUMENT_FORM: LegalDocumentFormValues = {
  docNumber: "",
  docType: "law",
  title: "",
  issuedDate: "",
  effectiveDate: "",
};

export function legalDocumentToFormValues(document: LegalDocument): LegalDocumentFormValues {
  return {
    docNumber: document.docNumber,
    docType: oneOf<LegalDocumentType>(LEGAL_DOCUMENT_TYPES, document.docType, "other"),
    title: document.title,
    issuedDate: document.issuedDate ?? "",
    effectiveDate: document.effectiveDate ?? "",
  };
}

export function toLegalDocumentBody(values: LegalDocumentFormValues) {
  return {
    docNumber: values.docNumber.trim(),
    docType: values.docType,
    title: values.title.trim(),
    issuedDate: textOrNull(values.issuedDate),
    effectiveDate: textOrNull(values.effectiveDate),
  };
}
