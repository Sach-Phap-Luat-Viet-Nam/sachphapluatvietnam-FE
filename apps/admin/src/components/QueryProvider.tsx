"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** TanStack Query cho dữ liệu phía client của admin. Mỗi trình duyệt một `QueryClient`, tạo một lần. */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // API Admin trả 403 khi thiếu quyền: thử lại không giúp gì, chỉ tốn request.
          queries: { retry: false, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
