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
  inStock: z.boolean(),
});
export type BookSummary = z.infer<typeof bookSummarySchema>;

export const bookPageSchema = z.object({
  items: z.array(bookSummarySchema),
  meta: z.object({ page: z.number(), limit: z.number(), total: z.number() }),
});
export type BookPage = z.infer<typeof bookPageSchema>;

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
