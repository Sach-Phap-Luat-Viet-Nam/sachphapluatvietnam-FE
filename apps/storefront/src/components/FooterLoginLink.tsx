"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { getServerSessionState, getSessionState, subscribeSession } from "@slvn/auth";

/**
 * Link Đăng nhập ở footer, ẩn khi khách đã đăng nhập. Phiên do `AccountNav` ở header khôi phục; trong lúc chưa kiểm
 * tra xong vẫn hiện link để HTML từ server và client giống nhau.
 */
export function FooterLoginLink() {
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  if (session.status === "authenticated") {
    return null;
  }
  return (
    <Link href="/dang-nhap" className="link-underline w-fit">
      Đăng nhập
    </Link>
  );
}
