"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { DriveStep, Driver, Popover, PopoverDOM } from "driver.js";
import "driver.js/dist/driver.css";
import { setTourActive } from "@/lib/onboarding-gate";
import { tourSelector } from "@/lib/tour-anchor";
import type { TourTarget } from "@/lib/tour-anchor";
import { placeGuide } from "./guide-placement";
import type { Box } from "./guide-placement";
import { GUIDE_FACING, GUIDE_IMAGES, GUIDE_SHAPE, TOUR_STEPS, availableSteps } from "./steps";
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

const GUIDE_WIDTH_PX = 240;
const GUIDE_WIDTH_MOBILE_PX = 160;

function boxOf(element: Element): Box {
  const { left, top, right, bottom } = element.getBoundingClientRect();
  return { left, top, right, bottom };
}

/**
 * Đặt ảnh nhân vật theo hộp text, né phần tử đang được giới thiệu (xem `placeGuide`). Trả `false` khi không đủ chỗ ở bước
 * này, lúc đó nhân vật bị ẩn.
 */
function positionGuide(guide: HTMLImageElement, wrapper: HTMLElement, step: TourStep): boolean {
  const shape = GUIDE_SHAPE[step.pose];
  const nominal = (window.innerWidth < 640 ? GUIDE_WIDTH_MOBILE_PX : GUIDE_WIDTH_PX) * shape.scale;
  const target = step.target ? document.querySelector(tourSelector(step.target)) : null;
  const placement = placeGuide(
    boxOf(wrapper),
    { width: window.innerWidth, height: window.innerHeight },
    nominal,
    GUIDE_FACING[step.pose],
    target ? boxOf(target) : undefined,
    shape.ratio,
  );
  if (!placement) {
    return false;
  }
  guide.style.width = `${placement.width}px`;
  guide.style.left = `${placement.left}px`;
  guide.style.top = `${placement.top}px`;
  guide.style.transform = placement.flip ? "scaleX(-1)" : "none";
  return true;
}

/**
 * Tải và giải mã sẵn ảnh của các tư thế sẽ dùng ngay khi tour bắt đầu. Không có bước này thì ảnh của bước kế phải tải từ
 * mạng lúc khách bấm Tiếp: ảnh cũ đã mờ đi mà ảnh mới chưa hiện, nhân vật biến mất một nhịp rồi mới xuất hiện.
 */
function preloadGuides(steps: readonly TourStep[]): void {
  for (const url of new Set(steps.map((step) => GUIDE_IMAGES[step.pose]))) {
    const image = new Image();
    image.src = url;
    // Chỉ để làm nóng cache của trình duyệt: lỗi thì để lúc hiện thật xử lý.
    void image.decode().catch(() => undefined);
  }
}

function createGuideImage(): HTMLImageElement {
  // Hộp text do driver.js tạo bằng DOM nên không dùng được `next/image`; kích thước khai báo theo từng tư thế ở `show`.
  const image = document.createElement("img");
  image.className = "tour-guide";
  image.alt = "";
  image.decoding = "async";
  document.body.append(image);
  return image;
}

interface GuideLayer {
  show: (popover: PopoverDOM, step: TourStep) => void;
  dispose: () => void;
}

/**
 * Nhân vật đứng sau hộp text, thò ra ngoài. Ảnh nằm ngoài DOM của hộp (driver.js cắt xén và định vị riêng phần hộp) nên
 * là thẻ `img` gắn vào `body`.
 *
 * Dùng **hai ảnh luân phiên** để chuyển bước mượt: ảnh của bước mới tải và giải mã xong rồi mới đặt vào chỗ của nó và hiện
 * dần lên (trồi nhẹ từ dưới), cùng lúc ảnh của bước trước mờ dần đi. Đổi `src` của một ảnh duy nhất thì ảnh nhảy vị trí
 * và đổi hình tức thì, trông thô.
 */
function createGuideLayer(): GuideLayer {
  let images: HTMLImageElement[] = [];
  let active = -1;
  /** Mỗi lần `show`/`dispose` tăng một bậc để bỏ kết quả của lần gọi cũ (ảnh tải chậm, khách bấm Tiếp liên tục). */
  let token = 0;
  let stopTracking: (() => void) | undefined;

  const stop = () => {
    stopTracking?.();
    stopTracking = undefined;
  };

  return {
    show(popover, step) {
      stop();
      const current = ++token;
      if (images.length === 0) {
        images = [createGuideImage(), createGuideImage()];
      }
      const index = (active + 1) % images.length;
      const next = images[index];
      const previous = images[active];
      if (!next) {
        return;
      }
      const shape = GUIDE_SHAPE[step.pose];
      next.width = shape.width;
      next.height = shape.height;
      next.src = GUIDE_IMAGES[step.pose];
      // Driver focus phần tử đầu tiên là nút X; chuyển sang nút chính để Enter là đi tiếp (sau lượt focus của driver).
      requestAnimationFrame(() => popover.nextButton.focus());

      void next
        .decode()
        // Ảnh lỗi thì thôi, hộp text vẫn dùng được; không ghi log vì chỉ là phần trang trí.
        .catch(() => undefined)
        .then(() => {
          if (current !== token) {
            return;
          }
          const reposition = () => {
            // Bấm Tiếp thì driver ẩn hộp cũ rồi mới vẽ hộp mới. Hộp đang ẩn (kích thước 0) không phải là "hết chỗ": giữ
            // nguyên ảnh để nó đổi sang ảnh mới cùng lúc, không tắt trước rồi để trống một nhịp.
            const { width, height } = popover.wrapper.getBoundingClientRect();
            if (width > 0 && height > 0) {
              next.classList.toggle("is-active", positionGuide(next, popover.wrapper, step));
            }
          };
          reposition();
          // Ép tính style trước khi bật `is-active` để chuyển động hiện dần chạy kể cả với ảnh vừa được thêm vào trang.
          void next.offsetWidth;
          previous?.classList.remove("is-active");
          active = index;

          // Hộp có thể dịch chuyển (driver tự né mép viewport, khách cuộn/resize trong lúc hộp mở) nên theo dõi liên tục.
          const observer = new ResizeObserver(reposition);
          observer.observe(popover.wrapper);
          window.addEventListener("scroll", reposition, { passive: true, capture: true });
          window.addEventListener("resize", reposition);
          stopTracking = () => {
            observer.disconnect();
            window.removeEventListener("scroll", reposition, true);
            window.removeEventListener("resize", reposition);
          };
        });
    },
    dispose() {
      token += 1;
      stop();
      images.forEach((image) => image.remove());
      images = [];
      active = -1;
    },
  };
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
    // Ảnh nhân vật nằm ngoài DOM của driver nên driver không tự gỡ: phải gỡ cùng lúc với hộp (`guide.dispose`).
    const guide = createGuideLayer();

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
            preloadGuides(steps);
            const scrim = getComputedStyle(document.documentElement).getPropertyValue("--color-scrim").trim();
            // Khách dừng hướng dẫn (Hoàn tất, Bỏ qua, X, Esc): ghi dấu đã xem, cho popup hiện rồi mới gỡ hộp. Không dựa vào
            // `onDestroyed`: driver bỏ qua hook này khi khách dừng lúc hộp đầu tiên còn đang hiện dần lên.
            const end = () => {
              markTourDone(localStore());
              setTourActive(false);
              guide.dispose();
              const current = tour;
              tour = null;
              current?.destroy();
            };
            tour = driver({
              steps: steps.map((step, index) => toDriveStep(step, index, steps.length, end)),
              popoverClass: "tour-popover",
              ...(scrim ? { overlayColor: scrim } : {}),
              overlayOpacity: 0.9,
              // Bấm nhầm ra ngoài không làm mất hướng dẫn; muốn dừng thì bấm X, "Bỏ qua" hoặc Esc.
              overlayClickBehavior: "none",
              disableActiveInteraction: true,
              stagePadding: 6,
              stageRadius: 4,
              animate: true,
              smoothScroll: true,
              showProgress: true,
              progressText: "{{current}}/{{total}}",
              nextBtnText: "Tiếp",
              prevBtnText: "Quay lại",
              doneBtnText: "Hoàn tất",
              closeBtnLabel: "Bỏ qua hướng dẫn",
              onPopoverRender: (popover, { index }) => {
                const step = index === undefined ? undefined : steps[index];
                if (step) {
                  guide.show(popover, step);
                }
              },
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
      guide.dispose();
      tour?.destroy();
      setTourActive(false);
    };
  }, [pathname]);

  return null;
}
