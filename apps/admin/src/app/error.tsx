"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@slvn/ui";

export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Lỗi từ Server Component chỉ còn `digest` ở client; dùng để đối chiếu log server.
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null;
  return (
    <main id="noi-dung" className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">Đã có lỗi xảy ra</h1>
      <p className="text-muted max-w-md leading-7">
        Hệ thống đang bận hoặc tạm gián đoạn. Anh/chị thử lại sau ít phút.
      </p>
      <Button size="lg" onClick={() => retry()}>
        <RefreshCw size={17} aria-hidden="true" /> Thử lại
      </Button>
      {digest && <p className="text-muted text-sm">Mã tra cứu: {digest}</p>}
    </main>
  );
}
