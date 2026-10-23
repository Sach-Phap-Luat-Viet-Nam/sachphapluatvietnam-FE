import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sách Luật Việt Nam", template: "%s | Sách Luật Việt Nam" },
  description: "Khám phá tủ sách pháp luật Việt Nam: bộ luật, chú giải và giáo trình chuyên sâu.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
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
