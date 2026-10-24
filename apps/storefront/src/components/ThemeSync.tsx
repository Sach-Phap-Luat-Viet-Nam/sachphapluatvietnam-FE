"use client";

import { useEffect, useRef } from "react";
import { applyTheme, readStoredTheme } from "@/lib/theme";
import { saveThemePreference } from "@/lib/theme-api";
import { useSession } from "@/lib/use-session";

/**
 * Đồng bộ giao diện giữa tài khoản và trình duyệt, một lần cho mỗi tài khoản đăng nhập: tài khoản đã chọn thì dùng
 * lựa chọn đó (thiết bị khác cũng thấy), chưa chọn mà trình duyệt đã có lựa chọn thì lưu lên tài khoản.
 */
export function ThemeSync() {
  const session = useSession();
  const syncedUserId = useRef<number | null>(null);
  const userId = session.status === "authenticated" && !session.impersonation ? session.user.id : null;
  const accountTheme = session.status === "authenticated" ? (session.user.theme ?? null) : null;

  useEffect(() => {
    if (userId === null || syncedUserId.current === userId) {
      return;
    }
    syncedUserId.current = userId;
    if (accountTheme) {
      applyTheme(accountTheme);
      return;
    }
    const local = readStoredTheme();
    if (local) {
      saveThemePreference(local).catch(() => {});
    }
  }, [userId, accountTheme]);

  return null;
}
