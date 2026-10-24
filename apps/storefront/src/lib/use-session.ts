import { useEffect, useSyncExternalStore } from "react";
import { getServerSessionState, getSessionState, restoreSession, subscribeSession } from "@slvn/auth";
import type { SessionState } from "@slvn/auth";

/** Phiên đăng nhập ở trình duyệt; tự khôi phục từ cookie khi tải trang. Chỉ dùng trong Client Component. */
export function useSession(): SessionState {
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  useEffect(() => {
    restoreSession();
  }, []);
  return session;
}

/** Khóa phân biệt dữ liệu riêng của từng người (giỏ, đơn) trong cache TanStack Query. */
export function sessionOwner(session: SessionState): string {
  return session.status === "authenticated" ? `user-${session.user.id}` : session.status;
}
