import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Be_Vietnam_Pro } from "next/font/google";
import { QueryProvider } from "@/components/QueryProvider";
import "./globals.css";

const sans = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
});

export const metadata: Metadata = {
  title: { default: "Quản trị Sách Luật Việt Nam", template: "%s | Quản trị Sách Luật" },
  description: "Trang quản trị nội bộ của Sách Luật Việt Nam.",
  // Trang nội bộ: không cho máy tìm kiếm index (kèm robots.ts).
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { colorScheme: "light" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={sans.variable}>
      <body>
        <a
          href="#noi-dung"
          className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:p-3"
        >
          Đến nội dung chính
        </a>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
