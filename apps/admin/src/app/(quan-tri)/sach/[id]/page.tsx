import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookEditor } from "@/features/catalog/BookEditor";

export const metadata: Metadata = { title: "Chi tiết đầu sách" };

export default async function BookPage({ params }: PageProps<"/sach/[id]">) {
  const { id } = await params;
  // Id đầu sách là số nguyên dương; chuỗi khác thì 404 luôn, không gọi API.
  if (!/^[1-9]\d{0,15}$/.test(id)) {
    notFound();
  }
  return <BookEditor bookId={Number(id)} />;
}
