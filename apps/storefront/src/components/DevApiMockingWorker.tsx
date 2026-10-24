"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setupWorker } from "msw/browser";
import { addressHandlers } from "@/mocks/address-handlers";

/** Worker khởi động một lần cho cả trang (Strict Mode chạy effect hai lần, start/stop chồng nhau sẽ hỏng worker). */
let starting: Promise<unknown> | null = null;

function startWorker(): Promise<unknown> {
  // Chỉ chặn route sổ địa chỉ, mọi request khác đi thẳng tới proxy/backend thật.
  starting ??= setupWorker(...addressHandlers())
    .start({ onUnhandledFrame: "bypass", quiet: true })
    .then(() => console.warn("Đang giả lập API sổ địa chỉ bằng MSW (NEXT_PUBLIC_API_MOCKING=addresses)."));
  return starting;
}

/**
 * Khởi động MSW trong trình duyệt. Chỉ nạp qua `DevApiMocking` (`next/dynamic`, `ssr: false`) vì `msw/browser` không
 * có bản cho server. Worker sẵn sàng sau lần render đầu nên tải lại dữ liệu tài khoản (lần gọi đầu đã nhận 404 thật).
 */
export function DevApiMockingWorker() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    void startWorker().then(() => {
      if (!cancelled) void queryClient.invalidateQueries({ queryKey: ["account"] });
    });
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  return null;
}
