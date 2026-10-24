import type { Metadata } from "next";
import { ReceiptCreate } from "@/features/inventory/ReceiptCreate";

export const metadata: Metadata = { title: "Lập phiếu nhập kho" };

export default function ReceiptCreatePage() {
  return <ReceiptCreate />;
}
