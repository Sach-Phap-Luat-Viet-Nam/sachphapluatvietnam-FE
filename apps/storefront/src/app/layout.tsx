import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Be_Vietnam_Pro, Noto_Serif } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

const sans = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
});

// Georgia thiếu glyph tiếng Việt trên nhiều máy (dấu lệch, lẫn font) nên tiêu đề dùng Noto Serif.
const editorial = Noto_Serif({
  subsets: ["vietnamese", "latin"],
  style: ["normal", "italic"],
  variable: "--font-noto-serif",
});

export const metadata: Metadata = {
  title: { default: "Sách Luật Việt Nam", template: "%s | Sách Luật Việt Nam" },
  description: "Khám phá tủ sách pháp luật Việt Nam: bộ luật, chú giải và giáo trình chuyên sâu.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`${sans.variable} ${editorial.variable}`}>
      <body>
        <a
          href="#noi-dung"
          className="focus:bg-background sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:p-3"
        >
          Đến nội dung chính
        </a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
