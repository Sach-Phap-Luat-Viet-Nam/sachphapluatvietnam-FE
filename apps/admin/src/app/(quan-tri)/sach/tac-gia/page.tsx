import type { Metadata } from "next";
import { AuthorManager } from "@/features/catalog/AuthorManager";

export const metadata: Metadata = { title: "Tác giả" };

export default function AuthorsPage() {
  return <AuthorManager />;
}
