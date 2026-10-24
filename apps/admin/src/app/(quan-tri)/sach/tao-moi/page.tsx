import type { Metadata } from "next";
import { BookCreate } from "@/features/catalog/BookCreate";

export const metadata: Metadata = { title: "Thêm đầu sách" };

export default function CreateBookPage() {
  return <BookCreate />;
}
