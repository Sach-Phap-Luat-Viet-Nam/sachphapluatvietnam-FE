/** Mép trên/dưới của phần tử theo khung nhìn (`getBoundingClientRect`). */
export interface VerticalBox {
  top: number;
  bottom: number;
}

export interface PageViewport {
  height: number;
  scrollY: number;
  /** `scrollHeight − innerHeight`: không cuộn quá đáy trang. */
  maxScrollY: number;
}

/**
 * `scrollY` cần cuộn tới để phần tử của bước kế nằm giữa màn hình, hoặc `null` khi phần tử đã nằm trọn trong màn hình (khỏi
 * cuộn, giữ hiệu ứng lỗ sáng trượt sang). Cùng tiêu chí và cùng vị trí với `scrollIntoView` của driver.js (giữa màn hình,
 * phần tử cao hơn màn hình thì mép trên chạm đầu) nên cuộn xong driver không tự cuộn thêm lần nữa.
 */
export function stepScrollTarget(box: VerticalBox, viewport: PageViewport, topShare?: number): number | null {
  if (topShare !== undefined) {
    const target = Math.min(
      viewport.maxScrollY,
      Math.max(0, Math.round(viewport.scrollY + box.top - viewport.height * topShare)),
    );
    return Math.abs(target - viewport.scrollY) <= 1 ? null : target;
  }
  if (box.top >= 0 && box.bottom <= viewport.height) {
    return null;
  }
  const height = box.bottom - box.top;
  const offset = height > viewport.height ? box.top : box.top + height / 2 - viewport.height / 2;
  return Math.min(viewport.maxScrollY, Math.max(0, Math.round(viewport.scrollY + offset)));
}
