/**
 * Phối hợp giữa hướng dẫn sử dụng và popup quảng cáo (hai tính năng không import lẫn nhau): khi hướng dẫn đang chạy
 * thì popup đợi, hướng dẫn kết thúc (xong hoặc bỏ qua) thì popup mới hiện.
 */
let tourActive = false;
let waiters: Array<() => void> = [];

export function setTourActive(active: boolean): void {
  tourActive = active;
  if (!active) {
    const ready = waiters;
    waiters = [];
    ready.forEach((resolve) => resolve());
  }
}

export function isTourActive(): boolean {
  return tourActive;
}

/** Xong ngay nếu không có hướng dẫn nào đang chạy, ngược lại đợi tới khi hướng dẫn kết thúc. */
export function waitForTourIdle(): Promise<void> {
  if (!tourActive) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(resolve);
  });
}
