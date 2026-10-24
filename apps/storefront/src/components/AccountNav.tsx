"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { getServerSessionState, getSessionState, logout, restoreSession, subscribeSession } from "@slvn/auth";

const LOGOUT_ERROR = "Chưa đăng xuất được, vui lòng thử lại.";

/** Link Đăng nhập, hoặc tên khách và nút Đăng xuất khi đã có phiên. */
export function AccountNav() {
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);

  useEffect(() => {
    restoreSession();
  }, []);

  if (session.status !== "authenticated") {
    // Trong lúc kiểm tra phiên vẫn hiện link Đăng nhập để HTML từ server và client giống nhau, không xê dịch layout.
    return (
      <Link href="/dang-nhap" className="link-underline flex min-h-11 items-center gap-2 text-[15px]">
        <UserRound size={20} strokeWidth={1.6} />
        <span>Đăng nhập</span>
      </Link>
    );
  }

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutFailed(false);
    try {
      await logout();
    } catch {
      setLogoutFailed(true);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px]">
      <span className="flex min-h-11 max-w-56 items-center gap-2">
        <UserRound size={20} strokeWidth={1.6} className="shrink-0" />
        <span className="truncate">{session.user.fullName}</span>
      </span>
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={loggingOut}
        className="link-underline text-mist hover:text-gold flex min-h-11 items-center gap-2 disabled:opacity-60"
      >
        <LogOut size={18} strokeWidth={1.6} />
        {loggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
      </button>
      {logoutFailed && (
        <p role="alert" className="text-danger w-full text-sm">
          {LOGOUT_ERROR}
        </p>
      )}
    </div>
  );
}
