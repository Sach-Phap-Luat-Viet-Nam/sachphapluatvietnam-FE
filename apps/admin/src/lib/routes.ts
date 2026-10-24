export const HOME_PATH = "/";
export const LOGIN_PATH = "/dang-nhap";
export const TWO_FACTOR_SETUP_PATH = "/xac-thuc-hai-lop";

/** Trang đăng nhập, kèm `?next=` để quay lại trang đang mở sau khi đăng nhập. */
export function loginPath(next: string): string {
  return next === HOME_PATH ? LOGIN_PATH : `${LOGIN_PATH}?next=${encodeURIComponent(next)}`;
}
