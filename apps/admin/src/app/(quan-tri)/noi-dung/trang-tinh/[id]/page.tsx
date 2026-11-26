import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StaticPageEdit } from "@/features/static-pages/StaticPageEditor";

export const metadata: Metadata = { title: "Sửa trang tĩnh" };

export default async function StaticPagePage({ params }: PageProps<"/noi-dung/trang-tinh/[id]">) {
  const { id } = await params;
  // Id trang là số nguyên dương; chuỗi khác thì 404 luôn, không gọi API.
  if (!/^[1-9]\d{0,15}$/.test(id)) {
    notFound();
  }
  return <StaticPageEdit pageId={Number(id)} />;
}
