import { unwrap } from "@slvn/api-client";
import { browserApi } from "@slvn/auth";
import type { PopupBody } from "./popup-form";
import { adminPopupSchema, popupPageSchema } from "./schemas";
import type { AdminPopup, PopupPage } from "./schemas";

// API Admin popup (docs/features/popup.md), policy `content_admin`: `super_admin`, `marketing`, bắt buộc 2FA.

export const POPUPS_PAGE_SIZE = 20;

/** Danh sách popup, sắp theo ưu tiên. */
export async function fetchPopups(page: number): Promise<PopupPage> {
  const data = await unwrap(
    browserApi().GET("/api/v1/admin/popups", { params: { query: { page, limit: POPUPS_PAGE_SIZE } } }),
  );
  return popupPageSchema.parse(data);
}

export async function fetchPopup(id: number): Promise<AdminPopup> {
  return adminPopupSchema.parse(
    await unwrap(browserApi().GET("/api/v1/admin/popups/{id}", { params: { path: { id } } })),
  );
}

export async function createPopup(body: PopupBody): Promise<AdminPopup> {
  return adminPopupSchema.parse(await unwrap(browserApi().POST("/api/v1/admin/popups", { body })));
}

export async function updatePopup(id: number, body: PopupBody): Promise<AdminPopup> {
  const data = await unwrap(browserApi().PUT("/api/v1/admin/popups/{id}", { params: { path: { id } }, body }));
  return adminPopupSchema.parse(data);
}

/** Xóa mềm: popup biến mất khỏi Admin và Storefront. */
export async function deletePopup(id: number): Promise<void> {
  await unwrap(browserApi().DELETE("/api/v1/admin/popups/{id}", { params: { path: { id } } }));
}

export const popupKeys = {
  lists: ["popups"] as const,
  list: (page: number) => ["popups", "list", page] as const,
  detail: (id: number) => ["popups", "detail", id] as const,
};
