"use client";

import { usePathname, useRouter } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { tourAnchor } from "@/lib/tour-anchor";
import { requestTourReplay } from "./tour-replay";

/** Nút để xem lại hướng dẫn sử dụng; hướng dẫn chạy ở trang chủ nên đang ở trang khác thì chuyển về. */
function useReplay() {
  const pathname = usePathname();
  const router = useRouter();
  return () => {
    requestTourReplay();
    if (pathname !== "/") {
      router.push("/");
    }
  };
}

/** Link chữ ở chân trang, cạnh các link khác (lối vào phụ; mốc cho hướng dẫn đặt ở `TourReplayFab`). */
export function TourReplayButton({ className }: { className?: string }) {
  const handleClick = useReplay();
  return (
    <button type="button" onClick={handleClick} className={className}>
      Xem hướng dẫn sử dụng
    </button>
  );
}

/**
 * Nút tròn nổi ở góc phải dưới mọi trang, xếp ngay trên nút Zalo (cùng cột, cùng cỡ), luôn thấy mà không cần cuộn tới
 * chân trang; là mốc cho bước cuối của hướng dẫn sử dụng (`data-tour="replay"`). Không đặt ở góc trái vì chỉ báo dev
 * của Next.js nằm đúng chỗ đó và che mất nút khi chạy `next dev`.
 */
export function TourReplayFab() {
  const handleClick = useReplay();
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Xem hướng dẫn sử dụng"
      title="Xem hướng dẫn sử dụng"
      {...tourAnchor("replay")}
      className="bg-panel/95 border-gold/50 hover:border-gold hover:text-gold text-mist fixed right-4 bottom-22 z-40 flex size-14 items-center justify-center rounded-full border shadow-[0_16px_30px_-12px_rgb(0_0_0/0.8)] transition-colors sm:right-6 sm:bottom-26"
    >
      <HelpCircle size={24} strokeWidth={1.6} />
    </button>
  );
}
