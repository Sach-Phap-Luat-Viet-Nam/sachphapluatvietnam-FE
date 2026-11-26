import type { Metadata } from "next";
import { StaticPageList } from "@/features/static-pages/StaticPageList";

export const metadata: Metadata = { title: "Trang tĩnh" };

export default function StaticPagesPage() {
  return <StaticPageList />;
}
