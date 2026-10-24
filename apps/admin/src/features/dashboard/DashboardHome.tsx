"use client";

import { useSyncExternalStore } from "react";
import { getServerSessionState, getSessionState, subscribeSession } from "@slvn/auth";
import { modulesForRoles } from "@/lib/modules";
import { staffRoleLabels } from "@/lib/roles";

/** Trang Tổng quan: lời chào và các phần quản trị theo vai trò. Chỉ render bên trong `AdminShell`. */
export function DashboardHome() {
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  if (session.status !== "authenticated") {
    return null;
  }

  const { user } = session;
  const modules = modulesForRoles(user.roles).filter((module) => module.id !== "overview");
  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Xin chào, {user.fullName}</h1>
        <p className="text-muted">Vai trò: {staffRoleLabels(user.roles).join(", ")}</p>
      </header>

      {modules.length > 0 ? (
        <section aria-labelledby="modules-title" className="flex flex-col gap-4">
          <h2 id="modules-title" className="text-xl font-semibold">
            Phần việc của anh/chị
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {modules.map((module) => (
              <li key={module.id} className="bg-background border-border flex flex-col gap-2 rounded-lg border p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">{module.label}</h3>
                  {!module.ready && (
                    <span className="bg-warning-surface text-warning rounded px-2 py-0.5 text-sm">Đang phát triển</span>
                  )}
                </div>
                <p className="text-muted leading-7">{module.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="bg-background border-border rounded-lg border p-5 leading-7">
          Vai trò của anh/chị chưa có màn hình quản trị riêng. Liên hệ Super Admin nếu cần thêm quyền.
        </p>
      )}
    </div>
  );
}
