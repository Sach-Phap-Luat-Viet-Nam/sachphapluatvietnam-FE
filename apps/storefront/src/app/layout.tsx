import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Be_Vietnam_Pro, Lora } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SessionEndedNotice } from "@/components/SessionEndedNotice";
import { SessionRealtime } from "@/components/SessionRealtime";
import { ThemeSync } from "@/components/ThemeSync";
import { QueryProvider } from "@/components/QueryProvider";
import { ZaloContact } from "@/components/ZaloContact";
import { ImpersonationBanner } from "@/features/impersonation/ImpersonationBanner";
import { PromoPopup } from "@/features/popup/PromoPopup";
import { GuidedTour } from "@/features/tour/GuidedTour";
import { TourReplayFab } from "@/features/tour/TourReplayButton";
import { THEME_INIT_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

const sans = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-be-vietnam-pro",
});

// Font tiêu đề phải có bộ glyph tiếng Việt (Georgia thiếu, dấu bị lệch hoặc lẫn font). Không dùng Playfair Display:
// nét mảnh quá tương phản, cỡ nhỏ trên nền tối khó đọc và dấu chồng chữ dày đặc.
const editorial = Lora({
  subsets: ["vietnamese", "latin"],
  style: ["normal", "italic"],
  variable: "--font-lora",
});

export const metadata: Metadata = {
  title: { default: "Sách Luật Việt Nam", template: "%s | Sách Luật Việt Nam" },
  description: "Khám phá tủ sách pháp luật Việt Nam: bộ luật, chú giải và giáo trình chuyên sâu.",
};

export const viewport: Viewport = { themeColor: "#0d1524", colorScheme: "dark light" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // `data-theme` do script đầu trang đặt trước khi hydrate nên React không được cảnh báo lệch thuộc tính.
    <html lang="vi" className={`${sans.variable} ${editorial.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <a
          href="#noi-dung"
          className="focus:bg-gold focus:text-ink sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:p-3"
        >
          Đến nội dung chính
        </a>
        <QueryProvider>
          <ThemeSync />
          <SessionRealtime />
          <SessionEndedNotice />
          <ImpersonationBanner />
          <Header />
          {children}
          <Footer />
          <GuidedTour />
          <PromoPopup />
          <TourReplayFab />
          <ZaloContact />
        </QueryProvider>
      </body>
    </html>
  );
}
