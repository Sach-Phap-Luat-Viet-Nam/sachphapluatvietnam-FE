import { z } from "zod";

// `StaticPageResponse` theo BE docs/features/static-pages.md; OpenAPI trong repo chưa có route này nên parse bằng Zod.
export const staticPageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  /** HTML Admin soạn, chưa lọc: chỉ render sau `preparePolicyHtml`. */
  contentHtml: z.string(),
  updatedAt: z.string(),
});
export type StaticPage = z.infer<typeof staticPageSchema>;
