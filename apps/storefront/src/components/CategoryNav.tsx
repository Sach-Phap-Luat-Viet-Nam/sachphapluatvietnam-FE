import Link from "next/link";
import { BookOpen, ChevronDown, Menu } from "lucide-react";
import { getCategoryTree } from "@/features/catalog/api";
import type { CategoryNode } from "@/features/catalog/schemas";

/** Số danh mục gốc hiện trên thanh điều hướng desktop; mobile hiện đủ. */
const DESKTOP_CATEGORY_LIMIT = 4;

export interface CategoryNavProps {
  categories: readonly Pick<CategoryNode, "slug" | "name">[];
}

export function CategoryNav({ categories }: CategoryNavProps) {
  const categoryLinks = categories.map((category) => ({
    href: `/sach?category=${encodeURIComponent(category.slug)}`,
    label: category.name,
  }));
  const textbookLink = { href: "/sach?type=textbook", label: "Giáo trình" };
  const desktopLinks = [...categoryLinks.slice(0, DESKTOP_CATEGORY_LIMIT), textbookLink];
  const mobileLinks = [{ href: "/sach", label: "Tất cả sách luật" }, ...categoryLinks, textbookLink];
  return (
    <>
      <nav aria-label="Điều hướng chính" className="hidden h-full items-center gap-9 md:flex">
        <Link
          href="/sach"
          className="border-primary text-primary flex h-full items-center gap-2 border-b-2 font-semibold"
        >
          <BookOpen size={18} /> Tất cả sách luật
        </Link>
        {desktopLinks.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-accent text-sm">
            {link.label}
          </Link>
        ))}
      </nav>
      <details className="group relative md:hidden">
        <summary className="flex list-none items-center gap-2 py-3 font-medium">
          <Menu size={20} /> Danh mục sách <ChevronDown size={16} />
        </summary>
        <nav
          aria-label="Danh mục trên điện thoại"
          className="border-border bg-background absolute top-full left-0 max-h-[70dvh] w-72 overflow-auto rounded-b-lg border p-3 shadow-lg"
        >
          {mobileLinks.map((link) => (
            <Link className="hover:bg-surface block rounded px-3 py-3" href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </details>
    </>
  );
}

/** Tải danh mục gốc cho Header. Lỗi không chặn cả trang: Header vẫn hiện link chung. */
export async function CategoryNavLoader() {
  let categories: CategoryNode[] = [];
  try {
    categories = await getCategoryTree();
  } catch (error) {
    console.error("Không tải được danh mục cho Header", error);
  }
  return <CategoryNav categories={categories} />;
}
