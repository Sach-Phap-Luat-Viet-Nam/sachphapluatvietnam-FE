"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { SessionEndReason } from "@slvn/auth";
import { useSession } from "@/lib/use-session";

const MESSAGES: Record<SessionEndReason, string> = {
  signed_in_elsewhere:
    "Tài khoản của anh/chị vừa được đăng nhập ở một nơi khác nên phiên này đã kết thúc. Mỗi tài khoản chỉ đăng nhập được trên một thiết bị.",
  forced_logout:
    "Phiên đăng nhập của anh/chị đã được quản trị viên kết thúc. Vui lòng đăng nhập lại; cần hỗ trợ xin liên hệ Sách Luật Việt Nam.",
};

/** Báo khách vì sao bị đăng xuất đột ngột (sự kiện `session-ended` từ server). */
export function SessionEndedNotice() {
  const session = useSession();
  const [dismissed, setDismissed] = useState<SessionEndReason | null>(null);
  const reason = session.status === "anonymous" ? session.sessionEnded : undefined;
  if (!reason || dismissed === reason) {
    return null;
  }
  return (
    <div role="alert" className="bg-burgundy text-cream sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 text-[15px]">
        <p>
          {MESSAGES[reason]}{" "}
          <Link href="/dang-nhap" className="font-semibold underline underline-offset-4">
            Đăng nhập lại
          </Link>
        </p>
        <button
          type="button"
          onClick={() => setDismissed(reason)}
          className="hover:bg-cream/15 flex size-11 shrink-0 items-center justify-center transition-colors"
        >
          <X size={18} strokeWidth={1.6} />
          <span className="sr-only">Đóng thông báo</span>
        </button>
      </div>
    </div>
  );
}
