import type { Metadata } from "next";
import { CategoryManager } from "@/features/catalog/CategoryManager";

export const metadata: Metadata = { title: "Danh mục" };

export default function CategoriesPage() {
  return <CategoryManager />;
}
