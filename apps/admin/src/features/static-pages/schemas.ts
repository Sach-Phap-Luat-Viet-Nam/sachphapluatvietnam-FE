import { z } from "zod";
import { SLUG_PATTERN } from "@slvn/utils";
import { pageSchema } from "@/lib/page-schema";
import type { Page } from "@/lib/page-schema";

// `/admin/pages` chưa có trong OpenAPI (khai báo ở packages/api-client/src/pending-paths.ts): parse theo
// BE docs/features/static-pages.md.

export const TITLE_MAX = 255;
export const SLUG_MAX = 100;
export const DESCRIPTION_MAX = 500;
export const CONTENT_MAX = 200_000;

export const staticPageSummarySchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  isPublished: z.boolean(),
  updatedAt: z.string(),
});
export type StaticPageSummary = z.infer<typeof staticPageSummarySchema>;

export const staticPageListSchema = pageSchema(staticPageSummarySchema);
export type StaticPageList = Page<StaticPageSummary>;

export const adminStaticPageSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  contentHtml: z.string(),
  isPublished: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminStaticPage = z.infer<typeof adminStaticPageSchema>;

/** Chữ thật trong HTML trình soạn thảo: editor rỗng vẫn trả `<p></p>`. */
export function htmlHasText(html: string): boolean {
  return (
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;| /g, " ")
      .trim().length > 0
  );
}

export const staticPageFormSchema = z.object({
  title: z.string().trim().min(1, "Anh/chị nhập tiêu đề.").max(TITLE_MAX, `Tối đa ${TITLE_MAX} ký tự.`),
  slug: z
    .string()
    .trim()
    .min(1, "Anh/chị nhập đường dẫn.")
    .max(SLUG_MAX, `Tối đa ${SLUG_MAX} ký tự.`)
    .regex(SLUG_PATTERN, "Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch nối, ví dụ chinh-sach-doi-tra."),
  description: z.string().trim().max(DESCRIPTION_MAX, `Tối đa ${DESCRIPTION_MAX} ký tự.`),
  contentHtml: z
    .string()
    .refine(htmlHasText, "Anh/chị nhập nội dung trang.")
    .refine((html) => html.length <= CONTENT_MAX, "Nội dung quá dài, anh/chị tách bớt sang trang khác."),
  isPublished: z.boolean(),
});
export type StaticPageFormValues = z.infer<typeof staticPageFormSchema>;
