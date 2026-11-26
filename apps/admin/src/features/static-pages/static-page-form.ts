import { slugify } from "@slvn/utils";
import type { AdminStaticPage, StaticPageFormValues } from "./schemas";

/** Slug có route riêng trên Storefront. Trang slug khác lưu được nhưng website chưa hiển thị (cần thêm route FE). */
export const STOREFRONT_PAGE_SLUGS: readonly string[] = ["dieu-khoan-su-dung", "chinh-sach-bao-mat"];

/** `id` Storefront đã dùng cho khung trang (`PolicyPage`), không đặt trùng cho mục. */
const RESERVED_IDS = new Set(["noi-dung", "bat-dau"]);

export function emptyStaticPageForm(): StaticPageFormValues {
  return { title: "", slug: "", description: "", contentHtml: "", isPublished: false };
}

export function staticPageToFormValues(page: AdminStaticPage): StaticPageFormValues {
  return {
    title: page.title,
    slug: page.slug,
    description: page.description ?? "",
    contentHtml: page.contentHtml,
    isPublished: page.isPublished,
  };
}

/**
 * Gắn `id` kebab-case cho mọi `<h2>` (mục lục và link `#id` trên Storefront): giữ `id` hợp lệ đã có để link cũ không
 * đổi khi sửa tiêu đề, thiếu thì sinh từ chữ trong tiêu đề, trùng thì thêm `-2`, `-3`... Chạy trên trình duyệt.
 */
export function withHeadingIds(html: string): string {
  const container = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body;
  const headings = [...container.querySelectorAll("h2")];
  if (headings.length === 0) return html;

  const used = new Set<string>();
  headings.forEach((heading, index) => {
    const base = slugify(heading.getAttribute("id") ?? "") || slugify(heading.textContent ?? "") || `muc-${index + 1}`;
    let id = base;
    for (let suffix = 2; used.has(id) || RESERVED_IDS.has(id); suffix++) {
      id = `${base}-${suffix}`;
    }
    used.add(id);
    heading.setAttribute("id", id);
  });
  return container.innerHTML;
}

/** Body `UpsertStaticPageRequest`. */
export function toStaticPageBody(values: StaticPageFormValues) {
  const description = values.description.trim();
  return {
    slug: values.slug.trim(),
    // Tiêu đề một dòng: xuống dòng (dán từ văn bản khác) đổi thành khoảng trắng.
    title: values.title.replace(/\s*\n\s*/g, " ").trim(),
    description: description === "" ? null : description,
    contentHtml: withHeadingIds(values.contentHtml),
    isPublished: values.isPublished,
  };
}
export type StaticPageBody = ReturnType<typeof toStaticPageBody>;

/** Gợi ý slug từ tiêu đề khi tạo mới, cắt theo giới hạn của backend. */
export function suggestSlug(title: string, maxLength: number): string {
  return slugify(title).slice(0, maxLength).replace(/-+$/, "");
}
