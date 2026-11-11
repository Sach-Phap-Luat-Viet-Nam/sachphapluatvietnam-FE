/** Gốc URL khi chạy local hoặc chưa cấu hình domain. */
export const LOCAL_SITE_URL = "http://localhost:3000";

export interface SiteUrlSource {
  /** Domain chính thức, ví dụ `https://sachluatvietnam.vn` (không có `/` cuối). */
  SITE_URL?: string;
  /** Vercel tự đặt: domain production của project, không có giao thức. */
  VERCEL_PROJECT_PRODUCTION_URL?: string;
}

function parseOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * Gốc URL tuyệt đối của storefront cho sitemap, robots và `metadataBase`. Thứ tự: `SITE_URL`, rồi domain production
 * Vercel (để bản deploy chưa khai báo `SITE_URL` vẫn có URL thật), cuối cùng là localhost.
 */
export function resolveSiteUrl(source: SiteUrlSource): string {
  const configured = source.SITE_URL?.trim();
  if (configured) {
    const origin = parseOrigin(configured);
    if (!origin) throw new Error(`SITE_URL không phải URL http(s) hợp lệ: ${configured}`);
    return origin;
  }
  const vercel = source.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return parseOrigin(`https://${vercel}`) ?? LOCAL_SITE_URL;
  return LOCAL_SITE_URL;
}
