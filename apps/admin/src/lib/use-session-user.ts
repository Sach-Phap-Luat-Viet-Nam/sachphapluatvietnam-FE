"use client";

import { useSyncExternalStore } from "react";
import { getServerSessionState, getSessionState, subscribeSession } from "@slvn/auth";
import type { SessionUser } from "@slvn/auth";

/** Người dùng đang đăng nhập, `null` khi chưa xác định phiên hoặc chưa đăng nhập. */
export function useSessionUser(): SessionUser | null {
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  return session.status === "authenticated" ? session.user : null;
}
