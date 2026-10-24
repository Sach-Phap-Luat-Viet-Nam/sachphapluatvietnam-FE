import { z } from "zod";
import { SLUG_PATTERN } from "@slvn/utils";
import {
  BOOK_STATUSES,
  BOOK_TYPES,
  COVER_TYPES,
  EDITION_STATUSES,
  LEGAL_DOCUMENT_TYPES,
  TARGET_AUDIENCES,
} from "./labels";

// Response: OpenAPI hiện sinh enum thành `number` và số thành `number | string`, lệch với JSON backend thật trả
// (enum snake_case, số nguyên). Parse theo docs/api_reference.md, mục "Admin — Catalog".

const namedReferenceSchema = z.object({ id: z.number(), name: z.string(), slug: z.string() });

export const skuSchema = z.object({
  id: z.number(),
  skuCode: z.string(),
  coverType: z.string(),
  listPrice: z.number(),
  salePrice: z.number(),
  discountPercent: z.number().nullable(),
  allowPreorder: z.boolean(),
  inStock: z.boolean(),
});
export type Sku = z.infer<typeof skuSchema>;

export const legalDocumentSchema = z.object({
  id: z.number(),
  docNumber: z.string(),
  docType: z.string(),
  title: z.string(),
  issuedDate: z.string().nullable(),
  effectiveDate: z.string().nullable(),
});
export type LegalDocument = z.infer<typeof legalDocumentSchema>;

export const editionSchema = z.object({
  id: z.number(),
  editionName: z.string().nullable(),
  isbn: z.string(),
  publisher: z.string(),
  publishingDecisionNo: z.string(),
  registrationNo: z.string().nullable(),
  publishYear: z.number().nullable(),
  updatedToText: z.string().nullable(),
  updatedToDate: z.string().nullable(),
  pages: z.number().nullable(),
  size: z.string().nullable(),
  weightGram: z.number().nullable(),
  coverImageUrl: z.string().nullable(),
  previewFileUrl: z.string().nullable(),
  tableOfContents: z.string().nullable(),
  releaseDate: z.string().nullable(),
  isLatest: z.boolean(),
  status: z.string(),
  skus: z.array(skuSchema),
  legalDocuments: z.array(legalDocumentSchema),
});
export type Edition = z.infer<typeof editionSchema>;

/** `AdminBookResponse`: mọi ấn bản kể cả `draft`. Các API sửa đầu sách/ấn bản/SKU đều trả lại kiểu này. */
export const adminBookSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  bookType: z.string(),
  status: z.string(),
  targetAudiences: z.array(z.string()),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  categories: z.array(namedReferenceSchema),
  authors: z.array(namedReferenceSchema),
  editions: z.array(editionSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminBook = z.infer<typeof adminBookSchema>;

export const adminBookSummarySchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  bookType: z.string(),
  status: z.string(),
  editionCount: z.number(),
  updatedAt: z.string(),
});
export type AdminBookSummary = z.infer<typeof adminBookSummarySchema>;

export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  parentId: z.number().nullable(),
  sortOrder: z.number(),
});
export type Category = z.infer<typeof categorySchema>;

export const authorSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  biography: z.string().nullable(),
  sortOrder: z.number(),
});
export type Author = z.infer<typeof authorSchema>;

export { pageSchema } from "@/lib/page-schema";
export type { Page } from "@/lib/page-schema";

// Form: mọi ô nhập giữ dạng chuỗi như trong `<input>`, chuyển sang kiểu của API ở forms.ts.

const REQUIRED = "Anh/chị nhập thông tin này.";

function requiredText(max: number) {
  return z.string().trim().min(1, REQUIRED).max(max, `Tối đa ${max} ký tự.`);
}

function optionalText(max?: number) {
  const text = z.string().trim();
  return max === undefined ? text : text.max(max, `Tối đa ${max} ký tự.`);
}

const slugField = z
  .string()
  .trim()
  .min(1, REQUIRED)
  .max(255, "Tối đa 255 ký tự.")
  .regex(SLUG_PATTERN, "Chỉ gồm chữ thường không dấu, số và dấu gạch nối đơn, ví dụ bo-luat-dan-su-2026.");

/** Số nguyên trong khoảng, để trống được. */
function optionalInteger(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) >= min && Number(value) <= max), message);
}

const sortOrderField = z
  .string()
  .trim()
  .regex(/^\d{1,6}$/, "Nhập số nguyên từ 0.");

const dateField = z.string().refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Ngày không hợp lệ.");

/** Mục đã chọn trong ô chọn tác giả / văn bản pháp luật: giữ cả nhãn để hiển thị. */
export const referenceSchema = z.object({ id: z.number(), label: z.string() });
export type Reference = z.infer<typeof referenceSchema>;

export const bookFormSchema = z.object({
  title: requiredText(255),
  slug: slugField,
  bookType: z.enum(BOOK_TYPES, "Anh/chị chọn loại sách."),
  status: z.enum(BOOK_STATUSES),
  description: optionalText(),
  targetAudiences: z.array(z.enum(TARGET_AUDIENCES)),
  metaTitle: optionalText(255),
  metaDescription: optionalText(500),
  categoryIds: z.array(z.number()),
  authors: z.array(referenceSchema),
});
export type BookFormValues = z.infer<typeof bookFormSchema>;

/** ISBN-13: 13 số (cho phép gạch nối/khoảng trắng), bắt đầu 978/979, đúng số kiểm tra. */
export function isValidIsbn13(value: string): boolean {
  const digits = value.replace(/[\s-]/g, "");
  if (!/^97[89]\d{10}$/.test(digits)) {
    return false;
  }
  const sum = [...digits.slice(0, 12)].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(digits[12]);
}

export const editionFormSchema = z.object({
  isbn: z.string().trim().refine(isValidIsbn13, "ISBN-13 gồm 13 số, bắt đầu 978 hoặc 979 và đúng số kiểm tra."),
  publisher: requiredText(255),
  publishingDecisionNo: requiredText(100),
  status: z.enum(EDITION_STATUSES),
  registrationNo: optionalText(100),
  editionName: optionalText(100),
  publishYear: optionalInteger(1900, 2100, "Năm xuất bản từ 1900 đến 2100."),
  updatedToText: optionalText(500),
  updatedToDate: dateField,
  pages: optionalInteger(1, 100_000, "Số trang là số nguyên lớn hơn 0."),
  size: optionalText(50),
  weightGram: optionalInteger(1, 100_000, "Khối lượng là số nguyên lớn hơn 0 (gam)."),
  coverImageUrl: optionalText(500),
  previewFileUrl: optionalText(500),
  tableOfContents: optionalText(),
  releaseDate: dateField,
  legalDocuments: z.array(referenceSchema),
});
export type EditionFormValues = z.infer<typeof editionFormSchema>;

const priceField = z
  .string()
  .trim()
  .regex(/^[1-9]\d{0,11}$/, "Giá là số nguyên VNĐ lớn hơn 0, không có dấu chấm.");

const priceShape = { listPrice: priceField, salePrice: priceField, allowPreorder: z.boolean() };

function salePriceWithinList(values: { listPrice: string; salePrice: string }, ctx: z.RefinementCtx) {
  if (Number(values.salePrice) > Number(values.listPrice)) {
    ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Giá bán không được lớn hơn giá bìa." });
  }
}

export const skuPriceFormSchema = z.object(priceShape).superRefine(salePriceWithinList);
export type SkuPriceFormValues = z.infer<typeof skuPriceFormSchema>;

export const skuCreateFormSchema = z
  .object({
    skuCode: z
      .string()
      .trim()
      .min(1, REQUIRED)
      .max(50, "Tối đa 50 ký tự.")
      .regex(/^[A-Za-z0-9-]+$/, "Chỉ gồm chữ, số và dấu gạch nối, ví dụ SLVN-BLDS-2026-BM."),
    coverType: z.enum(COVER_TYPES, "Anh/chị chọn loại bìa."),
    ...priceShape,
  })
  .superRefine(salePriceWithinList);
export type SkuCreateFormValues = z.infer<typeof skuCreateFormSchema>;

export const categoryFormSchema = z.object({
  name: requiredText(255),
  slug: slugField,
  /** `""`: danh mục gốc. */
  parentId: z.string(),
  sortOrder: sortOrderField,
});
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const authorFormSchema = z.object({
  name: requiredText(255),
  slug: slugField,
  biography: optionalText(),
  sortOrder: sortOrderField,
});
export type AuthorFormValues = z.infer<typeof authorFormSchema>;

export const legalDocumentFormSchema = z.object({
  docNumber: z.string().trim().min(1, REQUIRED),
  docType: z.enum(LEGAL_DOCUMENT_TYPES, "Anh/chị chọn loại văn bản."),
  title: z.string().trim().min(1, REQUIRED),
  issuedDate: dateField,
  effectiveDate: dateField,
});
export type LegalDocumentFormValues = z.infer<typeof legalDocumentFormSchema>;
