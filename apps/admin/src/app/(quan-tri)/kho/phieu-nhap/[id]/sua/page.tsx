import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReceiptEdit } from "@/features/inventory/ReceiptEdit";

export const metadata: Metadata = { title: "Sửa phiếu nhập" };

export default async function ReceiptEditPage({ params }: PageProps<"/kho/phieu-nhap/[id]/sua">) {
  const { id } = await params;
  // Id phiếu là số nguyên dương; chuỗi khác thì 404 luôn, không gọi API.
  if (!/^[1-9]\d{0,15}$/.test(id)) {
    notFound();
  }
  return <ReceiptEdit receiptId={Number(id)} />;
}
