import type { Metadata } from "next";
import { BookList } from "@/features/catalog/BookList";

export const metadata: Metadata = { title: "Đầu sách" };

export default function BooksPage() {
  return <BookList />;
}
