import type { Metadata } from "next";
import { StaticPageCreate } from "@/features/static-pages/StaticPageEditor";

export const metadata: Metadata = { title: "Thêm trang tĩnh" };

export default function CreateStaticPagePage() {
  return <StaticPageCreate />;
}
