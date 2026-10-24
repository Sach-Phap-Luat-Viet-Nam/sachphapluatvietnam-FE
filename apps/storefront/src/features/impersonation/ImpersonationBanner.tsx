"use client";

import { useEffect, useState } from "react";
import { endImpersonation } from "@slvn/auth";
import { formatCountdown } from "@slvn/utils";
import { useSession } from "@/lib/use-session";

const TITLE_PREFIX = "[Đăng nhập hộ] ";

/**
 * Banner cố định khi Super Admin đăng nhập hộ khách (docs/features/fast-login-super-admin.md): luôn hiện tài khoản
 * đang dùng, thời gian còn lại và nút thoát. Tab vừa kết thúc đăng nhập hộ thì báo có thể đóng tab.
 */
export function ImpersonationBanner() {
  const session = useSession();
  const impersonation = session.status === "authenticated" ? session.impersonation : undefined;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!impersonation) {
      return;
    }
    const timer = setInterval(() => {
      setNow(Date.now());
      // Next.js đổi `document.title` mỗi lần chuyển trang nên gắn lại tiền tố theo nhịp đồng hồ.
      if (!document.title.startsWith(TITLE_PREFIX)) {
        document.title = TITLE_PREFIX + document.title;
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      document.title = document.title.replace(TITLE_PREFIX, "");
    };
  }, [impersonation]);

  if (session.status === "anonymous" && session.impersonationEnded) {
    return (
      <div role="status" className="bg-burgundy text-ivory px-4 py-3 text-center text-[15px]">
        {session.impersonationEnded === "expired" ? "Phiên đăng nhập hộ đã hết hạn." : "Đã thoát đăng nhập hộ."} Bạn có
        thể đóng tab này.
      </div>
    );
  }
  if (session.status !== "authenticated" || !impersonation) {
    return null;
  }
  return (
    <div role="region" aria-label="Đang đăng nhập hộ" className="bg-burgundy text-ivory sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-[15px]">
        <p>
          Đang đăng nhập hộ <strong className="break-all">{session.user.email}</strong>, còn{" "}
          <span className="tabular-nums">{formatCountdown(impersonation.expiresAt - now)}</span>. Mọi thao tác được ghi
          nhận như do khách thực hiện.
        </p>
        <button
          type="button"
          onClick={() => endImpersonation("exited")}
          className="border-ivory/60 hover:bg-ivory hover:text-burgundy min-h-11 border px-4 font-medium transition-colors"
        >
          Thoát đăng nhập hộ
        </button>
      </div>
    </div>
  );
}
