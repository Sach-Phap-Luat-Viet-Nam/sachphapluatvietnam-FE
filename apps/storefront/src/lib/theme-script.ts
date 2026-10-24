// Hằng số và script đầu trang của giao diện sáng/tối. Tách khỏi `theme.ts` (có hook React) để Server Component
// (layout) import được mà không kéo theo mã Client.

export type Theme = "dark" | "light";

export const DEFAULT_THEME: Theme = "dark";
export const THEME_STORAGE_KEY = "slvn:theme";
export const THEME_COLORS: Record<Theme, string> = { dark: "#0d1524", light: "#f7f3ea" };

/**
 * Chạy trong <head> trước khi vẽ để không nháy tối rồi mới sáng. Phải khớp với `readStoredTheme`; chép thẳng chuỗi
 * thay vì import vì script này chạy ngoài bundle.
 */
export const THEME_INIT_SCRIPT = `(function(){var t="dark";try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");if(s==="light"||s==="dark"){t=s}}catch(e){}var d=document.documentElement;d.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m){m.setAttribute("content",t==="light"?"${THEME_COLORS.light}":"${THEME_COLORS.dark}")}})();`;
