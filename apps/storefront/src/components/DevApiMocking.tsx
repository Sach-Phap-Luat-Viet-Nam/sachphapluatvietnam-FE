"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { publicEnv } from "@/lib/public-env";

/**
 * Bật MSW trong trình duyệt khi `NEXT_PUBLIC_API_MOCKING=addresses` để thử sổ địa chỉ trước khi backend có API.
 * Không bật thì không tải MSW. Worker khởi động sau lần render đầu nên tải lại dữ liệu tài khoản khi sẵn sàng.
 */
export function DevApiMocking() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (publicEnv.NEXT_PUBLIC_API_MOCKING !== "addresses") return;
    let cancelled = false;
    void (async () => {
      const [{ setupWorker }, { addressHandlers }] = await Promise.all([
        import("msw/browser"),
        import("@/mocks/address-handlers"),
      ]);
      if (cancelled) return;
      // Chỉ chặn route sổ địa chỉ, mọi request khác đi thẳng tới proxy/backend thật.
      await setupWorker(...addressHandlers()).start({ onUnhandledRequest: "bypass", quiet: true });
      console.warn("Đang giả lập API sổ địa chỉ bằng MSW (NEXT_PUBLIC_API_MOCKING=addresses).");
      void queryClient.invalidateQueries({ queryKey: ["account"] });
    })();
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  return null;
}
