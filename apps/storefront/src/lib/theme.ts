import { useSyncExternalStore } from "react";
import { DEFAULT_THEME, THEME_COLORS, THEME_STORAGE_KEY } from "./theme-script";
import type { Theme } from "./theme-script";

// Giao diện sáng/tối của storefront (docs/features/storefront-theme.md). Mặc định tối. Lựa chọn nằm ở thuộc tính
// `data-theme` của <html> (CSS đọc), `localStorage` (khách vãng lai và lần tải đầu) và tài khoản (API, khi đã đăng nhập).

export { DEFAULT_THEME, THEME_COLORS, THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from "./theme-script";
export type { Theme } from "./theme-script";

const listeners = new Set<() => void>();

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

/** Giao diện người dùng đã chọn trên trình duyệt này; `null` khi chưa chọn hoặc trình duyệt chặn storage. */
export function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

function currentTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : DEFAULT_THEME;
}

/** Đổi giao diện ngay trên trang. `remember` ghi vào `localStorage` để lần tải sau không nháy sai giao diện. */
export function applyTheme(theme: Theme, remember = true): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  if (remember) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Trình duyệt chặn storage: giao diện chỉ giữ tới khi tải lại trang (hoặc lấy từ tài khoản khi đăng nhập).
    }
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Giao diện đang áp dụng; server luôn render như mặc định rồi script đầu trang chỉnh lại trước khi hydrate. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => DEFAULT_THEME);
}
