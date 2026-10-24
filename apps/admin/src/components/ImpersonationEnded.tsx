"use client";

import { Clock } from "lucide-react";
import { Button } from "@slvn/ui";
import type { ImpersonationEnd } from "@slvn/auth";

/** Tab đăng nhập hộ đã kết thúc (hết 15 phút hoặc admin bấm Thoát). Không tự đăng nhập lại bằng cookie của admin. */
export function ImpersonationEnded({ reason }: { reason: ImpersonationEnd }) {
  return (
    <main id="noi-dung" className="flex min-h-dvh items-center justify-center p-4">
      <section className="bg-background border-border flex w-full max-w-md flex-col gap-4 rounded-lg border p-6 sm:p-8">
        <Clock size={32} className="text-warning" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">
          {reason === "expired" ? "Phiên đăng nhập hộ đã hết hạn" : "Đã thoát đăng nhập hộ"}
        </h1>
        <p className="text-muted leading-7">
          Anh/chị có thể đóng tab này. Muốn tiếp tục hỗ trợ thì quay lại trang quản trị và bấm “Đăng nhập hộ” lần nữa.
        </p>
        {/* Tải lại trang (không dùng `Link`) để tab khôi phục phiên của chính admin từ cookie. */}
        <Button
          variant="outline"
          onClick={() => {
            window.history.replaceState(null, "", "/");
            window.location.reload();
          }}
        >
          Về trang quản trị
        </Button>
      </section>
    </main>
  );
}
