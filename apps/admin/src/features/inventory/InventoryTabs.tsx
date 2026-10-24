"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@slvn/ui";

const TABS = [
  { href: "/kho", label: "Phiếu nhập" },
  { href: "/kho/ton-thap", label: "Tồn thấp" },
  { href: "/kho/the-kho", label: "Thẻ kho & xuất kho" },
] as const;

/** Tab con của phần Kho. Tab "Phiếu nhập" gồm cả màn lập phiếu và chi tiết `/kho/phieu-nhap/<id>`. */
export function InventoryTabs() {
  const pathname = usePathname();
  const active =
    TABS.slice(1).find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))?.href ?? "/kho";

  return (
    <nav aria-label="Quản lý kho" className="border-border -mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
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
