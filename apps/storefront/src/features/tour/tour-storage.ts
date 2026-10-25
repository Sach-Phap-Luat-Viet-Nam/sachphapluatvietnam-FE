type TourStore = Pick<Storage, "getItem" | "setItem">;

/** Tăng phiên bản khi đổi nội dung hướng dẫn để khách đã xem bản cũ được xem lại. */
export const TOUR_STORAGE_KEY = "tour:v1:done";

/**
 * Thiết bị mới (chưa có dấu đã xem) thì hiện hướng dẫn. Storage bị chặn (`null` hoặc ném lỗi) thì không hiện: không
 * nhớ được đã xem nên nếu hiện thì lần nào vào trang chủ cũng bị làm phiền.
 */
export function shouldStartTour(store: TourStore | null): boolean {
  try {
    return store !== null && store.getItem(TOUR_STORAGE_KEY) === null;
  } catch {
    return false;
  }
}

/** Ghi dấu đã xem khi khách xem hết hoặc bỏ qua. */
export function markTourDone(store: TourStore | null): void {
  try {
    store?.setItem(TOUR_STORAGE_KEY, "1");
  } catch {
    // Storage đầy hoặc bị chặn: lần sau `shouldStartTour` cũng đọc không được nên hướng dẫn không hiện lại.
  }
}
