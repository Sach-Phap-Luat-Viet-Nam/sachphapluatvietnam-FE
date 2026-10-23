"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button, Container } from "@slvn/ui";

export default function BooksError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Lỗi từ Server Component chỉ còn `digest` ở client; dùng để đối chiếu log server.
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null;
  return (
    <main id="noi-dung">
      <Container className="flex min-h-96 flex-col items-center justify-center gap-4 py-16 text-center">
        <TriangleAlert size={40} strokeWidth={1.2} className="text-accent" />
        <h1 className="text-primary text-2xl font-semibold">Chưa tải được tủ sách</h1>
        <p className="text-muted max-w-md text-sm leading-6">
          Hệ thống đang bận hoặc tạm thời gián đoạn. Bạn vui lòng thử lại sau ít phút.
        </p>
        <Button onClick={() => retry()}>
          <RefreshCw size={16} /> Thử lại
        </Button>
        {digest && <p className="text-muted text-xs">Mã tra cứu: {digest}</p>}
      </Container>
    </main>
  );
}
