/** Thời lượng mặc định (ms) của một lần trượt băng-rôn; dài hơn `scroll-behavior: smooth` của trình duyệt (~0,3–0,5 giây). */
export const SLIDE_DURATION_MS = 900;

export interface ScrollAnimation {
  /** Dừng giữa chừng (khách chạm hoặc cuộn tay); `onFinish` vẫn được gọi một lần. */
  cancel: () => void;
}

/** Tăng tốc nhẹ rồi giảm tốc dần về đích, nhìn mượt hơn tuyến tính. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Cuộn ngang `element` tới `to` trong `duration` ms bằng `requestAnimationFrame`. Trình duyệt không cho chỉnh thời lượng
 * của `scroll-behavior: smooth` nên tự cuộn từng khung; tạm tắt `scroll-snap` trong lúc cuộn (snap sẽ giằng lại vị trí
 * giữa chừng) rồi trả về như cũ khi xong.
 */
export function animateScrollLeft(
  element: HTMLElement,
  to: number,
  duration = SLIDE_DURATION_MS,
  onFinish?: () => void,
): ScrollAnimation {
  const from = element.scrollLeft;
  const startedAt = performance.now();
  const previousSnap = element.style.scrollSnapType;
  element.style.scrollSnapType = "none";
  let frame = 0;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    element.style.scrollSnapType = previousSnap;
    onFinish?.();
  };
  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    element.scrollLeft = from + (to - from) * easeInOutCubic(progress);
    if (progress < 1) {
      frame = requestAnimationFrame(step);
    } else {
      finish();
    }
  };
  frame = requestAnimationFrame(step);
  return { cancel: finish };
}

/** Cuộn dọc cả trang ngắn nhất và dài nhất (ms). */
const MIN_PAGE_SCROLL_MS = 600;
const MAX_PAGE_SCROLL_MS = 1600;

/**
 * Thời lượng cuộn dọc theo quãng đường: đủ chậm để khách thấy trang đang trôi tới đâu (cuộn mượt của trình duyệt chỉ
 * ~0,3–0,5 giây cho mọi quãng nên từ chân trang lên đầu trông như nhảy trang), nhưng không quá 1,6 giây.
 */
export function pageScrollDuration(distance: number): number {
  return Math.round(Math.min(MAX_PAGE_SCROLL_MS, Math.max(MIN_PAGE_SCROLL_MS, 450 + Math.abs(distance) * 0.35)));
}

/** Khách tự cuộn (lăn chuột, chạm) thì nhường lại, không giằng co với khách. */
const USER_SCROLL_EVENTS = ["wheel", "touchstart"] as const;

/**
 * Cuộn dọc cả trang tới `to` (px) bằng `requestAnimationFrame`, thời lượng mặc định theo `pageScrollDuration`. Mỗi khung
 * đặt `behavior: "instant"` để không bị `scroll-behavior: smooth` (nếu có) làm trễ thêm. Khách lăn chuột hoặc chạm màn hình
 * thì dừng ngay; `onFinish` luôn được gọi đúng một lần (xong, hủy hoặc khách cắt ngang).
 */
export function animateWindowScroll(
  to: number,
  onFinish?: () => void,
  duration = pageScrollDuration(to - window.scrollY),
): ScrollAnimation {
  const from = window.scrollY;
  const startedAt = performance.now();
  let frame = 0;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    USER_SCROLL_EVENTS.forEach((type) => window.removeEventListener(type, finish));
    onFinish?.();
  };
  // Đã ở đích thì xong ngay ở khung kế, không chờ đủ thời lượng tối thiểu.
  const time = Math.abs(to - from) < 1 ? 0 : duration;
  const step = (now: number) => {
    const progress = time === 0 ? 1 : Math.min(1, (now - startedAt) / time);
    window.scrollTo({ top: from + (to - from) * easeInOutCubic(progress), behavior: "instant" });
    if (progress < 1) {
      frame = requestAnimationFrame(step);
    } else {
      finish();
    }
  };
  USER_SCROLL_EVENTS.forEach((type) => window.addEventListener(type, finish, { passive: true }));
  frame = requestAnimationFrame(step);
  return { cancel: finish };
}
