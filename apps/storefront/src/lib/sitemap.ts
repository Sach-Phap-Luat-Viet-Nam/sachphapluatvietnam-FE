import type { MetadataRoute } from "next";

/** Trang công khai không phụ thuộc dữ liệu. Trang giỏ, thanh toán, tài khoản, đơn hàng không đưa vào. */
const STATIC_PATHS = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/sach", priority: 0.9, changeFrequency: "daily" },
  { path: "/khuyen-mai", priority: 0.6, changeFrequency: "weekly" },
] as const;

export interface SitemapBook {
  slug: string;
  coverImageUrl: string | null;
}

export interface SitemapCombo {
  slug: string;
}

/**
 * Danh sách URL của sitemap. Trang lọc theo danh mục (`/sach?category=`) không đưa vào vì canonical của chúng là
 * `/sach`; sitemap chỉ nên chứa URL canonical.
 */
export function sitemapEntries(
  siteUrl: string,
  books: readonly SitemapBook[],
  combos: readonly SitemapCombo[],
): MetadataRoute.Sitemap {
  const url = (path: string) => new URL(path, siteUrl).toString();
  return [
    ...STATIC_PATHS.map(({ path, priority, changeFrequency }) => ({ url: url(path), priority, changeFrequency })),
    ...books.map((book) => ({
      url: url(`/sach/${encodeURIComponent(book.slug)}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: book.coverImageUrl ? [book.coverImageUrl] : undefined,
    })),
    ...combos.map((combo) => ({
      url: url(`/combo/${encodeURIComponent(combo.slug)}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}

/**
 * Đường dẫn không cho công cụ tìm kiếm thu thập: trang theo phiên của khách và proxy API. Robots khớp theo tiền tố nên
 * `/dang-nhap` đã gồm `/dang-nhap-ho`, `/don-hang` gồm cả trang tra cứu.
 */
export const ROBOTS_DISALLOW = ["/api/", "/gio-hang", "/thanh-toan", "/tai-khoan", "/don-hang", "/dang-nhap", "/dang-ky"];
