import { unwrap } from "@slvn/api-client";
import { browserApi } from "@slvn/auth";
import type { StaticPageBody } from "./static-page-form";
import { adminStaticPageSchema, staticPageListSchema } from "./schemas";
import type { AdminStaticPage, StaticPageList } from "./schemas";

// API Admin trang tĩnh (BE docs/features/static-pages.md), policy `content_admin`: `super_admin`, `marketing`.

export const STATIC_PAGES_PAGE_SIZE = 20;

/** Danh sách trang tĩnh theo slug A→Z, không kèm nội dung. */
export async function fetchStaticPages(page: number): Promise<StaticPageList> {
  const data = await unwrap(
    browserApi().GET("/api/v1/admin/pages", { params: { query: { page, limit: STATIC_PAGES_PAGE_SIZE } } }),
  );
  return staticPageListSchema.parse(data);
}

export async function fetchStaticPage(id: number): Promise<AdminStaticPage> {
  return adminStaticPageSchema.parse(
    await unwrap(browserApi().GET("/api/v1/admin/pages/{id}", { params: { path: { id } } })),
  );
}

export async function createStaticPage(body: StaticPageBody): Promise<AdminStaticPage> {
  return adminStaticPageSchema.parse(await unwrap(browserApi().POST("/api/v1/admin/pages", { body })));
}

export async function updateStaticPage(id: number, body: StaticPageBody): Promise<AdminStaticPage> {
  return adminStaticPageSchema.parse(
    await unwrap(browserApi().PUT("/api/v1/admin/pages/{id}", { params: { path: { id } }, body })),
  );
}

/** Xóa hẳn (không có thùng rác): Storefront trả 404 cho đường dẫn này. */
export async function deleteStaticPage(id: number): Promise<void> {
  await unwrap(browserApi().DELETE("/api/v1/admin/pages/{id}", { params: { path: { id } } }));
}

export const staticPageKeys = {
  lists: ["static-pages"] as const,
  list: (page: number) => ["static-pages", "list", page] as const,
  detail: (id: number) => ["static-pages", "detail", id] as const,
};
