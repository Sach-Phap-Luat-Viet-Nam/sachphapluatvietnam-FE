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
