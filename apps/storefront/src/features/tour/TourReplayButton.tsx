"use client";

import { usePathname, useRouter } from "next/navigation";
import { tourAnchor } from "@/lib/tour-anchor";
import { requestTourReplay } from "./tour-replay";

/** Nút ở chân trang để xem lại hướng dẫn sử dụng; hướng dẫn chạy ở trang chủ nên đang ở trang khác thì chuyển về. */
export function TourReplayButton({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleClick = () => {
    requestTourReplay();
    if (pathname !== "/") {
      router.push("/");
    }
  };

  return (
    <button type="button" onClick={handleClick} {...tourAnchor("replay")} className={className}>
      Xem hướng dẫn sử dụng
    </button>
  );
}
