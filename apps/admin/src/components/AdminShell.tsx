"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, Megaphone, Menu, ShoppingCart, UserRound, Users, Warehouse, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SessionUser } from "@slvn/auth";
import { cn } from "@slvn/ui";
import { modulesForRoles } from "@/lib/modules";
import type { AdminModuleId } from "@/lib/modules";
import { staffRoleLabels } from "@/lib/roles";
import { LogoutButton } from "./LogoutButton";
import { SessionGate } from "./SessionGate";

const MODULE_ICONS: Record<AdminModuleId, LucideIcon> = {
  overview: LayoutDashboard,
  catalog: BookOpen,
  content: Megaphone,
  inventory: Warehouse,
  orders: ShoppingCart,
  users: Users,
};

const NAV_ITEM = "flex min-h-11 items-center gap-3 rounded-md px-3 text-base transition-colors";

/** Khung trang quản trị: chặn phiên, sidebar theo vai trò, thông tin người dùng và nút đăng xuất. */
export function AdminShell({ children }: { children: ReactNode }) {
  return <SessionGate requirement="admin">{(user) => <ShellLayout user={user}>{children}</ShellLayout>}</SessionGate>;
}

function ShellLayout({ user, children }: { user: SessionUser; children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="bg-primary text-primary-foreground flex flex-col lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-5 lg:py-6">
          <Link href="/" className="flex min-h-11 flex-col justify-center leading-tight">
            <span className="text-lg font-bold">Sách Luật Việt Nam</span>
            <span className="text-primary-foreground/75 text-sm">Trang quản trị</span>
          </Link>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="admin-menu"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            onClick={() => setMenuOpen(!menuOpen)}
            className="hover:bg-primary-hover flex size-11 items-center justify-center rounded-md lg:hidden"
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>

        <div
          id="admin-menu"
          className={cn("flex-1 flex-col gap-6 px-3 pb-4 lg:flex lg:px-3", menuOpen ? "flex" : "hidden")}
        >
          <nav aria-label="Quản trị">
            <ul className="flex flex-col gap-1">
              {modulesForRoles(user.roles).map((module) => {
                const Icon = MODULE_ICONS[module.id];
                const active = module.href === "/" ? pathname === "/" : pathname.startsWith(module.href);
                if (!module.ready) {
                  return (
                    <li key={module.id}>
                      <span aria-disabled="true" className={cn(NAV_ITEM, "text-primary-foreground/60")}>
                        <Icon size={19} aria-hidden="true" />
                        {module.label}
                        <span className="border-primary-foreground/30 ml-auto rounded border px-1.5 text-xs">
                          Sắp có
                        </span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={module.id}>
                    <Link
                      href={module.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        NAV_ITEM,
                        active ? "bg-primary-foreground text-primary font-semibold" : "hover:bg-primary-hover",
                      )}
                    >
                      <Icon size={19} aria-hidden="true" />
                      {module.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-primary-foreground/20 mt-auto flex flex-col gap-2 border-t px-3 pt-4">
            <p className="flex items-center gap-2 font-medium">
              <UserRound size={18} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{user.fullName}</span>
            </p>
            <p className="text-primary-foreground/75 text-sm">{staffRoleLabels(user.roles).join(" · ")}</p>
            <LogoutButton
              className="text-primary-foreground/85 hover:text-primary-foreground"
              errorClassName="text-primary-foreground font-medium"
            />
          </div>
        </div>
      </aside>

      <main id="noi-dung" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
