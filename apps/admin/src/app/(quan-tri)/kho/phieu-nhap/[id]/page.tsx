import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReceiptDetail } from "@/features/inventory/ReceiptDetail";

export const metadata: Metadata = { title: "Chi tiết phiếu nhập" };

export default async function ReceiptPage({ params }: PageProps<"/kho/phieu-nhap/[id]">) {
  const { id } = await params;
  // Id phiếu là số nguyên dương; chuỗi khác thì 404 luôn, không gọi API.
  if (!/^[1-9]\d{0,15}$/.test(id)) {
    notFound();
  }
  return <ReceiptDetail receiptId={Number(id)} />;
}
