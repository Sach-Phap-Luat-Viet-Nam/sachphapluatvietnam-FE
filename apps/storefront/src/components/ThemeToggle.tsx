"use client";

import { Moon, Sun } from "lucide-react";
import { applyTheme, useTheme } from "@/lib/theme";
import { saveThemePreference } from "@/lib/theme-api";
import { tourAnchor } from "@/lib/tour-anchor";
import { useSession } from "@/lib/use-session";

/** Nút chuyển giao diện sáng/tối; khách đã đăng nhập thì lưu lựa chọn vào tài khoản. */
export function ThemeToggle() {
  const theme = useTheme();
  const session = useSession();
  const next = theme === "dark" ? "light" : "dark";

  const handleClick = () => {
    applyTheme(next);
    // Phiên đăng nhập hộ là của khách: admin đổi giao diện không được ghi đè lựa chọn của khách.
    if (session.status === "authenticated" && !session.impersonation) {
      // Lưu tài khoản thất bại thì giao diện vẫn đổi và nhớ ở trình duyệt này; lần đăng nhập sau sẽ đồng bộ lại.
      saveThemePreference(next).catch(() => {});
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      {...tourAnchor("theme")}
      title={next === "light" ? "Giao diện sáng" : "Giao diện tối"}
      className="text-mist hover:text-gold flex size-11 shrink-0 items-center justify-center transition-colors"
    >
      {next === "light" ? <Sun size={19} strokeWidth={1.6} /> : <Moon size={19} strokeWidth={1.6} />}
      <span className="sr-only">{next === "light" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}</span>
    </button>
  );
}
