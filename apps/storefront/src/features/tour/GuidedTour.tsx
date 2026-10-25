"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { DriveStep, Driver, Popover, PopoverDOM } from "driver.js";
import "driver.js/dist/driver.css";
import { setTourActive } from "@/lib/onboarding-gate";
import { tourSelector } from "@/lib/tour-anchor";
import type { TourTarget } from "@/lib/tour-anchor";
import { GUIDE_IMAGES, TOUR_STEPS, availableSteps } from "./steps";
import type { TourStep } from "./steps";
import { subscribeTourReplay, takeTourReplay } from "./tour-replay";
import { markTourDone, shouldStartTour } from "./tour-storage";

/** Đợi hiệu ứng mở đầu của trang chủ chạy xong rồi mới phủ nền tối. */
const START_DELAY_MS = 1200;

function localStore(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    // Trình duyệt chặn storage: `shouldStartTour` sẽ không hiện hướng dẫn.
    return null;
  }
}

/** Phần tử phải đang hiện (không bị `hidden`, không bị thu gọn như thanh ưu đãi đã đóng) mới giới thiệu được. */
function isOnScreen(target: TourTarget): boolean {
  const element = document.querySelector(tourSelector(target));
  if (!element) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/** Ảnh nhân vật đặt cạnh nội dung. Driver giữ lại khung hộp text giữa các bước nên dùng lại thẻ `img` đã chèn. */
function renderGuide(popover: PopoverDOM, step: TourStep | undefined): void {
  if (!step) {
    return;
  }
  let guide = popover.wrapper.querySelector<HTMLImageElement>("img.tour-guide");
  if (!guide) {
    // Hộp text do driver.js tạo bằng DOM nên không dùng được `next/image`; kích thước khai báo sẵn để không xê dịch.
    guide = document.createElement("img");
    guide.className = "tour-guide";
    guide.alt = "";
    guide.width = 88;
    guide.height = 110;
    guide.decoding = "async";
    popover.wrapper.prepend(guide);
  }
  guide.src = GUIDE_IMAGES[step.pose];
  // Driver focus phần tử đầu tiên là nút X; chuyển sang nút chính để Enter là đi tiếp (sau lượt focus của driver).
  requestAnimationFrame(() => popover.nextButton.focus());
}

function toDriveStep(step: TourStep, index: number, total: number, skip: () => void): DriveStep {
  const popover: Popover = {
    title: step.title,
    description: step.description,
    ...(step.side ? { side: step.side } : {}),
    ...(step.align ? { align: step.align } : {}),
    // Bước chào: nút "Quay lại" (driver tự khóa ở bước đầu) đổi thành nút "Bỏ qua" cho dễ thấy.
    ...(index === 0 && total > 1
      ? { nextBtnText: "Bắt đầu", prevBtnText: "Bỏ qua", disableButtons: [], onPrevClick: skip }
      : {}),
  };
  return step.target ? { element: tourSelector(step.target), popover } : { popover };
}

/**
 * Hướng dẫn sử dụng cho thiết bị mới vào trang chủ lần đầu (docs/features/storefront-tour.md): nền tối, lỗ sáng ôm
 * từng nút kèm hộp text và nhân vật hướng dẫn. driver.js chỉ được tải khi hướng dẫn thật sự chạy.
 */
export function GuidedTour() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }
    let tour: Driver | null = null;
    let timer: number | undefined;
    let disposed = false;

    const start = () => {
      if (tour?.isActive() || timer !== undefined) {
        return;
      }
      // Báo cho popup quảng cáo đợi ngay từ lúc quyết định chạy, không đợi tới lúc hướng dẫn hiện.
      setTourActive(true);
      timer = window.setTimeout(() => {
        void import("driver.js")
          .then(({ driver }) => {
            timer = undefined;
            if (disposed) {
              return;
            }
            const steps = availableSteps(TOUR_STEPS, isOnScreen);
            const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            const scrim = getComputedStyle(document.documentElement).getPropertyValue("--color-scrim").trim();
            // Khách dừng hướng dẫn (Hoàn tất, Bỏ qua, X, Esc): ghi dấu đã xem, cho popup hiện rồi mới gỡ hộp. Không dựa vào
            // `onDestroyed`: driver bỏ qua hook này khi khách dừng lúc hộp đầu tiên còn đang hiện dần lên.
            const end = () => {
              markTourDone(localStore());
              setTourActive(false);
              const current = tour;
              tour = null;
              current?.destroy();
            };
            tour = driver({
              steps: steps.map((step, index) => toDriveStep(step, index, steps.length, end)),
              popoverClass: "tour-popover",
              ...(scrim ? { overlayColor: scrim } : {}),
              overlayOpacity: 0.72,
              // Bấm nhầm ra ngoài không làm mất hướng dẫn; muốn dừng thì bấm X, "Bỏ qua" hoặc Esc.
              overlayClickBehavior: "none",
              disableActiveInteraction: true,
              stagePadding: 6,
              stageRadius: 4,
              animate: !reduceMotion,
              smoothScroll: !reduceMotion,
              showProgress: true,
              progressText: "{{current}}/{{total}}",
              nextBtnText: "Tiếp",
              prevBtnText: "Quay lại",
              doneBtnText: "Hoàn tất",
              closeBtnLabel: "Bỏ qua hướng dẫn",
              onPopoverRender: (popover, { index }) =>
                renderGuide(popover, index === undefined ? undefined : steps[index]),
              // Có hook này thì driver không tự gỡ mà để `end()` gỡ. `destroy()` lúc rời trang chủ giữa chừng (nút Back)
              // không đi qua hook này nên chưa tính là đã xem.
              onDestroyStarted: end,
            });
            tour.drive();
          })
          .catch((error: unknown) => {
            // Không tải được thư viện (mạng chập chờn): bỏ qua lần này, lần sau vào trang chủ sẽ thử lại.
            console.warn("Không tải được hướng dẫn sử dụng", error);
            timer = undefined;
            setTourActive(false);
          });
      }, START_DELAY_MS);
    };

    if (takeTourReplay() || shouldStartTour(localStore())) {
      start();
    }
    const unsubscribe = subscribeTourReplay(() => {
      if (takeTourReplay()) {
        start();
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
      window.clearTimeout(timer);
      tour?.destroy();
      setTourActive(false);
    };
  }, [pathname]);

  return null;
}
