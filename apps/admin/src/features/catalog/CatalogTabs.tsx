"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@slvn/ui";

const TABS = [
  { href: "/sach", label: "Đầu sách" },
  { href: "/sach/danh-muc", label: "Danh mục" },
  { href: "/sach/tac-gia", label: "Tác giả" },
  { href: "/sach/van-ban-phap-luat", label: "Văn bản pháp luật" },
] as const;

/** Tab con của phần Sách. Tab "Đầu sách" gồm cả màn tạo mới và chi tiết `/sach/<id>`. */
export function CatalogTabs() {
  const pathname = usePathname();
  const active =
    TABS.slice(1).find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))?.href ?? "/sach";

  return (
    <nav aria-label="Quản lý sách" className="border-border -mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {TABS.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              aria-current={active === tab.href ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center border-b-2 px-3 font-medium transition-colors",
                active === tab.href
                  ? "border-primary text-primary"
                  : "text-muted hover:text-foreground border-transparent",
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
