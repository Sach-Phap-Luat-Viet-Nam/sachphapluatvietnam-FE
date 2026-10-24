import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import { Header } from "@/components/Header";
import { DevApiMocking } from "@/components/DevApiMocking";
import { Footer } from "@/components/Footer";
import { QueryProvider } from "@/components/QueryProvider";
import { ZaloContact } from "@/components/ZaloContact";
import { PromoPopup } from "@/features/popup/PromoPopup";
import "./globals.css";

const sans = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-be-vietnam-pro",
});

// Font tiêu đề phải có bộ glyph tiếng Việt (Georgia thiếu, dấu bị lệch hoặc lẫn font).
const editorial = Playfair_Display({
  subsets: ["vietnamese", "latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: { default: "Sách Luật Việt Nam", template: "%s | Sách Luật Việt Nam" },
  description: "Khám phá tủ sách pháp luật Việt Nam: bộ luật, chú giải và giáo trình chuyên sâu.",
};

export const viewport: Viewport = { themeColor: "#0d1524", colorScheme: "dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`${sans.variable} ${editorial.variable}`}>
      <body>
        <a
          href="#noi-dung"
          className="focus:bg-gold focus:text-ink sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:p-3"
        >
          Đến nội dung chính
        </a>
        <QueryProvider>
          <Header />
          {children}
          <Footer />
          <PromoPopup />
          <ZaloContact />
          <DevApiMocking />
        </QueryProvider>
      </body>
    </html>
  );
}
