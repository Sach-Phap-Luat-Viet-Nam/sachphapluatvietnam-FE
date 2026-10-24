import { z } from "zod";

// OpenAPI hiện sinh enum thành `number` và số thành `number | string`, lệch với JSON backend thật trả
// (enum snake_case, số nguyên). Parse theo docs/api_reference.md cho đến khi backend sửa OpenAPI.

export const bookSummarySchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  bookType: z.string(),
  editionName: z.string().nullable(),
  publishYear: z.number().nullable(),
  coverImageUrl: z.string().nullable(),
  updatedToText: z.string().nullable(),
  editionStatus: z.string().nullable(),
  salePrice: z.number().nullable(),
  listPrice: z.number().nullable(),
  discountPercent: z.number().nullable(),
  /** Thời điểm hết khuyến mãi của giá đang hiện (UTC). */
  saleEndsAt: z.string().nullish(),
  inStock: z.boolean(),
});
export type BookSummary = z.infer<typeof bookSummarySchema>;

export const bookPageSchema = z.object({
  items: z.array(bookSummarySchema),
  meta: z.object({ page: z.number(), limit: z.number(), total: z.number() }),
});
export type BookPage = z.infer<typeof bookPageSchema>;

const namedReferenceSchema = z.object({ id: z.number(), name: z.string(), slug: z.string() });

export const skuSchema = z.object({
  id: z.number(),
  skuCode: z.string(),
  coverType: z.string(),
  /** Giá bìa. */
  listPrice: z.number(),
  /** Giá đang áp dụng (đã gồm khuyến mãi nếu có). */
  salePrice: z.number(),
  /** Giá bán thường khi không có khuyến mãi; bằng `salePrice` nếu không khuyến mãi. */
  regularSalePrice: z.number().nullish(),
  /** `salePrice` so với giá bìa. */
  discountPercent: z.number().nullable(),
  /** Thời điểm hết khuyến mãi (UTC), `null` khi không có khuyến mãi hẹn giờ. */
  saleEndsAt: z.string().nullish(),
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

/** `GET /api/v1/books/{slug}`: ấn bản mới nhất đứng đầu `editions`. */
export const bookDetailSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  bookType: z.string(),
  targetAudiences: z.array(z.string()),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  categories: z.array(namedReferenceSchema),
  authors: z.array(namedReferenceSchema),
  editions: z.array(editionSchema),
});
export type BookDetail = z.infer<typeof bookDetailSchema>;

export interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  children: CategoryNode[];
}

export const categoryNodeSchema: z.ZodType<CategoryNode> = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  get children() {
    return z.array(categoryNodeSchema);
  },
});
