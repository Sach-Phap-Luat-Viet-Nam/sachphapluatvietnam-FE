"use client";

import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { getServerSessionState, getSessionState, subscribeSession } from "@slvn/auth";
import { ADMIN_MODULES, modulesForRoles } from "@/lib/modules";
import type { AdminModuleId } from "@/lib/modules";

export interface ModuleGateProps {
  module: AdminModuleId;
  children: ReactNode;
}

/**
 * Chỉ hiện màn hình khi vai trò được vào phần quản trị này (menu đã ẩn, đây là chặn khi gõ thẳng URL). Backend vẫn
 * kiểm tra lại quyền ở từng API. Chỉ dùng bên trong `AdminShell` (đã chặn phiên).
 */
export function ModuleGate({ module, children }: ModuleGateProps) {
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  if (session.status !== "authenticated") {
    return null;
  }
  if (modulesForRoles(session.user.roles).some((allowed) => allowed.id === module)) {
    return children;
  }
  const label = ADMIN_MODULES.find((item) => item.id === module)?.label ?? module;
  return (
    <section className="bg-background border-border flex max-w-xl flex-col gap-3 rounded-lg border p-6">
      <ShieldAlert size={28} className="text-danger" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">Không có quyền truy cập</h1>
      <p className="text-muted leading-7">
        Vai trò của anh/chị không được vào phần {label}. Liên hệ Super Admin nếu cần thêm quyền.
      </p>
    </section>
  );
}
