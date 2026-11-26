import { STOREFRONT_PAGE_SLUGS } from "./static-page-form";

/** Gốc URL Storefront (`NEXT_PUBLIC_STOREFRONT_URL`, đọc lúc build). Thiếu thì không hiện nút "Xem". */
const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL?.replace(/\/+$/, "") || null;

/** Link xem trang trên website; `null` khi Storefront chưa có route cho slug này hoặc thiếu cấu hình. */
export function storefrontPageUrl(slug: string, origin: string | null = STOREFRONT_URL): string | null {
  return origin && STOREFRONT_PAGE_SLUGS.includes(slug) ? `${origin}/${slug}` : null;
}
