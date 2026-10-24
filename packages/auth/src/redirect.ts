const DEFAULT_PATH = "/";
/** Trang không quay lại sau khi đăng nhập/đăng ký (tránh vòng lặp). */
const AUTH_PATHS = new Set(["/dang-nhap", "/dang-ky"]);

/**
 * Đường dẫn quay lại sau khi đăng nhập, lấy từ `?next=`. Chỉ nhận path nội bộ để không bị lợi dụng chuyển hướng
 * sang trang ngoài (`//evil.com`, `/\evil.com`, `https://...`).
 */
export function safeNextPath(next: string | null): string {
  if (!next?.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return DEFAULT_PATH;
  }
  const url = new URL(next, "http://localhost");
  if (url.origin !== "http://localhost" || AUTH_PATHS.has(url.pathname)) {
    return DEFAULT_PATH;
  }
  return url.pathname + url.search + url.hash;
}
