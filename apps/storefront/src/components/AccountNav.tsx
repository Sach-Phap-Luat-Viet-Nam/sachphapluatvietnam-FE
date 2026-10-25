"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { LogOut, Package, UserRound } from "lucide-react";
import { getServerSessionState, getSessionState, logout, restoreSession, subscribeSession } from "@slvn/auth";
import { Avatar } from "@slvn/ui";
import { tourAnchor } from "@/lib/tour-anchor";

const LOGOUT_ERROR = "Chưa đăng xuất được, vui lòng thử lại.";

/** Link Đăng nhập, hoặc tên khách (link tới trang tài khoản), link Đơn của tôi và nút Đăng xuất khi đã có phiên. */
export function AccountNav() {
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);

  useEffect(() => {
    restoreSession();
  }, []);

  if (session.status === "unknown") {
    // Chưa biết đã đăng nhập hay chưa (server luôn render ở trạng thái này): hiện khung chờ cùng cỡ với nút Đăng nhập
    // để khách đã đăng nhập tải lại trang không thấy nút Đăng nhập nháy lên rồi mới đổi, và layout không xê dịch.
    return (
      <div role="status" aria-busy="true" {...tourAnchor("account")} className="flex min-h-11 items-center">
        <span className="sr-only">Đang kiểm tra phiên đăng nhập…</span>
        <span aria-hidden="true" className="bg-ivory/10 block h-11 w-35 animate-pulse" />
      </div>
    );
  }

  if (session.status === "anonymous") {
    return (
      <Link
        href="/dang-nhap"
        {...tourAnchor("account")}
        className="border-gold/45 hover:border-gold hover:bg-gold hover:text-ink flex min-h-11 items-center gap-2 border px-4 text-[15px] transition-colors duration-300"
      >
        <UserRound size={19} strokeWidth={1.6} />
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
    // Mobile chỉ hiện icon (chữ vẫn còn cho trình đọc màn hình) để logo, giỏ và tài khoản nằm một hàng.
    <div {...tourAnchor("account")} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] sm:gap-x-4">
      <Link
        href="/tai-khoan"
        title="Tài khoản"
        className="group hover:text-gold flex min-h-11 max-w-60 items-center gap-2.5 transition-colors"
      >
        {/* Tên đã có ngay cạnh (hoặc trong sr-only) nên avatar chỉ để trang trí. */}
        <Avatar
          name={session.user.fullName}
          url={session.user.avatarUrl}
          size={36}
          className="border-gold/60 bg-gold/10 text-gold group-hover:border-gold border"
        />
        <span className="truncate font-medium max-sm:sr-only">{session.user.fullName}</span>
        <span className="sr-only">, tài khoản</span>
      </Link>
      <span aria-hidden="true" className="bg-ivory/15 h-6 w-px max-sm:hidden" />
      <Link
        href="/don-hang"
        className="link-underline text-mist hover:text-gold flex min-h-11 items-center gap-2 max-sm:w-10 max-sm:justify-center"
      >
        <Package size={18} strokeWidth={1.6} />
        <span className="max-sm:sr-only">Đơn của tôi</span>
      </Link>
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={loggingOut}
        className="link-underline text-mist hover:text-gold flex min-h-11 items-center gap-2 disabled:opacity-60 max-sm:w-10 max-sm:justify-center"
      >
        <LogOut size={18} strokeWidth={1.6} />
        {/* Tab đăng nhập hộ: `logout` chỉ xóa token ở tab này, không gọi `/auth/logout`. */}
        <span className="max-sm:sr-only">
          {loggingOut ? "Đang đăng xuất…" : session.impersonation ? "Thoát đăng nhập hộ" : "Đăng xuất"}
        </span>
      </button>
      {logoutFailed && (
        <p role="alert" className="text-danger w-full text-sm">
          {LOGOUT_ERROR}
        </p>
      )}
    </div>
  );
}
