"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { acceptImpersonationFromLocation } from "@slvn/auth";

/** Trang `/dang-nhap-ho` của tab mới: nhận phiên đăng nhập hộ từ URL fragment rồi vào trang tài khoản của khách. */
export function AcceptImpersonation() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  // Fragment bị xóa ngay lần đọc đầu; React Strict Mode chạy effect hai lần thì lần sau sẽ tưởng link không hợp lệ.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) {
      return;
    }
    handled.current = true;
    const accepted = acceptImpersonationFromLocation();
    void Promise.resolve().then(() => (accepted ? router.replace("/tai-khoan") : setFailed(true)));
  }, [router]);

  return failed ? (
    <p role="alert" className="text-danger leading-7">
      Liên kết đăng nhập hộ không hợp lệ hoặc đã được dùng. Quay lại trang quản trị và bấm “Đăng nhập hộ” lần nữa.
    </p>
  ) : (
    <p role="status" className="text-mist">
      Đang mở phiên đăng nhập hộ…
    </p>
  );
}
