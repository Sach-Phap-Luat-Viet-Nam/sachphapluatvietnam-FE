"use client";

import { useEffect } from "react";
import { startSessionRealtime } from "@slvn/auth";

/** Nghe thông báo kết thúc phiên (đăng nhập nơi khác, bị buộc đăng xuất) qua Pusher. Không cấu hình thì bỏ qua. */
export function SessionRealtime() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    return startSessionRealtime(key && cluster ? { key, cluster } : null);
  }, []);
  return null;
}
