/**
 * Yêu cầu xem lại hướng dẫn từ nút ở chân trang. Hướng dẫn chỉ chạy ở trang chủ nên yêu cầu được giữ lại tới khi khách
 * về trang chủ (nút sẽ chuyển trang nếu đang ở trang khác).
 */
let requested = false;
const listeners = new Set<() => void>();

export function requestTourReplay(): void {
  requested = true;
  listeners.forEach((listener) => listener());
}

/** Lấy yêu cầu đang chờ (nếu có) và xóa nó, để mỗi lần bấm chỉ chạy hướng dẫn một lần. */
export function takeTourReplay(): boolean {
  const pending = requested;
  requested = false;
  return pending;
}

export function subscribeTourReplay(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
