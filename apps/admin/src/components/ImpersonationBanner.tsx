"use client";

import { useEffect, useState } from "react";
import { UserRoundCog } from "lucide-react";
import { endImpersonation } from "@slvn/auth";
import type { Impersonation, SessionUser } from "@slvn/auth";
import { formatCountdown } from "@slvn/utils";

const TITLE_PREFIX = "[Đăng nhập hộ] ";

/**
 * Banner cố định khi tab đang đăng nhập hộ: backend không chặn thao tác nào nên luôn nhắc rõ đang dùng tài khoản của
 * ai và còn bao lâu. Thêm tiền tố vào tiêu đề tab để không nhầm với tab của chính admin.
 */
export function ImpersonationBanner({ user, impersonation }: { user: SessionUser; impersonation: Impersonation }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
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
  }, []);

  return (
    <div
      role="region"
      aria-label="Đang đăng nhập hộ"
      className="bg-warning-surface text-warning sticky top-0 z-50 border-b border-current/30"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <p className="flex items-center gap-2 font-medium">
          <UserRoundCog size={20} aria-hidden="true" className="shrink-0" />
          <span>
            Đang đăng nhập hộ <strong className="break-all">{user.email}</strong>, còn{" "}
            <span className="tabular-nums">{formatCountdown(impersonation.expiresAt - now)}</span>
          </span>
        </p>
        <button
          type="button"
          onClick={() => endImpersonation("exited")}
          className="min-h-11 rounded-md border border-current px-3 text-sm font-semibold hover:bg-current/10"
        >
          Thoát đăng nhập hộ
        </button>
      </div>
    </div>
  );
}
