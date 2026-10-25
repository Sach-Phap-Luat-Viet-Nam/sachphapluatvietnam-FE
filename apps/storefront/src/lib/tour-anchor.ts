/**
 * Mốc để hướng dẫn sử dụng (features/tour) tìm phần tử cần giới thiệu. Đặt ở `lib/` vì phần tử nằm rải rác ở nhiều
 * tính năng (giỏ hàng, ưu đãi...) mà các tính năng không được import lẫn nhau.
 */
export type TourTarget =
  | "promo-bar"
  | "search"
  | "theme"
  | "cart"
  | "account"
  | "explore"
  | "categories"
  | "offers"
  | "book"
  | "zalo"
  | "order-lookup"
  | "replay";

/** Thuộc tính gắn vào phần tử, ví dụ `<form {...tourAnchor("search")}>`. */
export function tourAnchor(target: TourTarget): { "data-tour": TourTarget } {
  return { "data-tour": target };
}

export function tourSelector(target: TourTarget): string {
  return `[data-tour="${target}"]`;
}
