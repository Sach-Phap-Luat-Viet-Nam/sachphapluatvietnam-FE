import type { Metadata } from "next";
import { ReceiptList } from "@/features/inventory/ReceiptList";

export const metadata: Metadata = { title: "Phiếu nhập kho" };

export default function ReceiptsPage() {
  return <ReceiptList />;
}
