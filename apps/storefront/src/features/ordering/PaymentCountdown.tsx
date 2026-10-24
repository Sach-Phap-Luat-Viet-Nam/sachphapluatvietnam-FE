"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@slvn/utils";
import { formatCountdown, remainingSeconds } from "./payment";

/** Đếm ngược hạn chuyển khoản (30 phút); quá hạn chưa đối soát được thì backend tự hủy đơn. */
export function PaymentCountdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => new Date());
  const seconds = remainingSeconds(expiresAt, now);
  const expired = seconds === 0;

  useEffect(() => {
    if (expired) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [expired]);

  if (expired) {
    return <p className="text-danger">Đã quá hạn thanh toán. Đơn chưa nhận được tiền sẽ tự hủy.</p>;
  }
  return (
    <p className="text-sand">
      Thời hạn chuyển khoản còn{" "}
      <time dateTime={expiresAt} className="text-gold-pale font-semibold tabular-nums">
        {formatCountdown(seconds)}
      </time>{" "}
      (đến {formatDateTime(expiresAt)}).
    </p>
  );
}
