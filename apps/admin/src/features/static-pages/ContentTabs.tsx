"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@slvn/ui";

const TABS = [
  { href: "/noi-dung/popup", label: "Popup quảng cáo" },
  { href: "/noi-dung/trang-tinh", label: "Trang tĩnh" },
] as const;

/** Tab con của phần Nội dung; mỗi tab gồm cả màn tạo mới và chi tiết bên dưới đường dẫn của nó. */
export function ContentTabs() {
  const pathname = usePathname();
  const active = TABS.find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))?.href;

  return (
    <nav aria-label="Quản lý nội dung" className="border-border -mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
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
