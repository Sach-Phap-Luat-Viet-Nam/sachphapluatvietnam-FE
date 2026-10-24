"use client";

import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { getServerSessionState, getSessionState, subscribeSession } from "@slvn/auth";
import type { SessionEndReason } from "@slvn/auth";

const MESSAGES: Record<SessionEndReason, string> = {
  signed_in_elsewhere:
    "Tài khoản của anh/chị vừa được đăng nhập ở một nơi khác nên phiên này đã kết thúc. Mỗi tài khoản chỉ đăng nhập được trên một thiết bị.",
  forced_logout:
    "Phiên đăng nhập của anh/chị đã bị Super Admin buộc đăng xuất. Vui lòng đăng nhập lại; nếu không mong muốn, hãy báo Super Admin.",
};

/** Báo nhân viên vì sao bị đăng xuất đột ngột (sự kiện `session-ended` từ server). Nằm ở layout nên còn hiện sau khi chuyển về trang đăng nhập. */
export function SessionEndedNotice() {
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  const [dismissed, setDismissed] = useState<SessionEndReason | null>(null);
  const reason = session.status === "anonymous" ? session.sessionEnded : undefined;
  if (!reason || dismissed === reason) {
    return null;
  }
  return (
    <div role="alert" className="border-warning bg-warning-surface text-warning sticky top-0 z-50 border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 text-[15px]">
        <p>{MESSAGES[reason]}</p>
        <button
          type="button"
          onClick={() => setDismissed(reason)}
          className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-black/5"
        >
          <X size={18} aria-hidden="true" />
          <span className="sr-only">Đóng thông báo</span>
        </button>
      </div>
    </div>
  );
}
