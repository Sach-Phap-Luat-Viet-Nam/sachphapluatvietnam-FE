import type { Metadata } from "next";
import { QuickBookCreate } from "@/features/catalog/QuickBookCreate";

export const metadata: Metadata = { title: "Tạo nhanh sách" };

export default function QuickCreateBookPage() {
  return <QuickBookCreate />;
}
