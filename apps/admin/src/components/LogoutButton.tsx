"use client";

import { useState, useSyncExternalStore } from "react";
import { LogOut } from "lucide-react";
import { getServerSessionState, getSessionState, logout, subscribeSession } from "@slvn/auth";
import { cn } from "@slvn/ui";

const LOGOUT_ERROR = "Chưa đăng xuất được, vui lòng thử lại.";

export interface LogoutButtonProps {
  className?: string;
  /** Màu thông báo lỗi; trên nền tối (sidebar) cần đổi để đủ tương phản. */
  errorClassName?: string;
}

/** Đăng xuất phía backend rồi mới xóa phiên; `SessionGate` tự chuyển về trang đăng nhập. */
export function LogoutButton({ className, errorClassName = "text-danger" }: LogoutButtonProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [failed, setFailed] = useState(false);
  // Tab đăng nhập hộ: `logout` chỉ xóa token ở tab này, không gọi `/auth/logout` (sẽ đăng xuất chính admin).
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  const impersonating = session.status === "authenticated" && session.impersonation !== undefined;

  const handleLogout = async () => {
    setLoggingOut(true);
    setFailed(false);
    try {
      await logout();
    } catch {
      // Backend lỗi: giữ phiên để thử lại, tránh tưởng đã đăng xuất trong khi cookie vẫn còn (máy dùng chung).
      setFailed(true);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={loggingOut}
        className={cn(
          "text-muted hover:text-foreground flex min-h-11 items-center gap-2 text-base transition-colors disabled:opacity-60",
          className,
        )}
      >
        <LogOut size={18} aria-hidden="true" />
        {loggingOut ? "Đang đăng xuất…" : impersonating ? "Thoát đăng nhập hộ" : "Đăng xuất"}
      </button>
      {failed && (
        <p role="alert" className={cn("text-sm", errorClassName)}>
          {LOGOUT_ERROR}
        </p>
      )}
    </div>
  );
}
