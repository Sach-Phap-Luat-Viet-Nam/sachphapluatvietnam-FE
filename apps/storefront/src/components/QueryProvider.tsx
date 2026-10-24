"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isApiError } from "@slvn/api-client";

/** Lỗi 4xx (hết hàng, sai dữ liệu, quá tần suất) thử lại cũng vậy; chỉ thử lại một lần khi lỗi mạng hoặc 5xx. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && !(isApiError(error) && error.status < 500);
}

/** TanStack Query cho dữ liệu riêng của khách ở trình duyệt (giỏ hàng). Mỗi trình duyệt một `QueryClient`. */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: shouldRetry },
          mutations: { retry: false },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
