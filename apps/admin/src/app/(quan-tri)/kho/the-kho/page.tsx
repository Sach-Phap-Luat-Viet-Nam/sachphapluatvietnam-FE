import type { Metadata } from "next";
import { StockCardLookup } from "@/features/inventory/StockCardLookup";

export const metadata: Metadata = { title: "Thẻ kho" };

export default function StockCardLookupPage() {
  return <StockCardLookup />;
}
