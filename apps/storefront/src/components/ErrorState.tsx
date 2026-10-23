"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Container } from "@slvn/ui";

export interface ErrorStateProps {
  error: unknown;
  retry: () => void;
  title: string;
}

/** Giao diện chung cho `error.tsx`: thông báo, nút thử lại và mã tra cứu `digest`. */
export function ErrorState({ error, retry, title }: ErrorStateProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Lỗi từ Server Component chỉ còn `digest` ở client; dùng để đối chiếu log server.
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null;
  return (
    <main id="noi-dung">
      <Container className="flex min-h-112 flex-col items-center justify-center gap-5 py-20 text-center">
        <span className="text-gold text-xs tracking-[0.3em]">TẠM GIÁN ĐOẠN</span>
        <h1 className="font-editorial text-4xl font-bold">{title}</h1>
        <p className="text-mist max-w-md leading-7">
          Hệ thống đang bận hoặc tạm thời gián đoạn. Bạn vui lòng thử lại sau ít phút.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="btn-sweep bg-gold text-ink flex h-12 items-center gap-2.5 px-7 font-semibold"
        >
          <RefreshCw size={17} /> Thử lại
        </button>
        {digest && <p className="text-dim text-xs">Mã tra cứu: {digest}</p>}
      </Container>
    </main>
  );
}
