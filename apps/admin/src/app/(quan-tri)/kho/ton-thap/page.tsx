import type { Metadata } from "next";
import { LowStockList } from "@/features/inventory/LowStockList";

export const metadata: Metadata = { title: "Tồn thấp" };

export default function LowStockPage() {
  return <LowStockList />;
}
