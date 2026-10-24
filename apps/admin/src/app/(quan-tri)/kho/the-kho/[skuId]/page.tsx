import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StockCardView } from "@/features/inventory/StockCardView";

export const metadata: Metadata = { title: "Thẻ kho" };

export default async function StockCardPage({ params }: PageProps<"/kho/the-kho/[skuId]">) {
  const { skuId } = await params;
  // Id SKU là số nguyên dương; chuỗi khác thì 404 luôn, không gọi API.
  if (!/^[1-9]\d{0,15}$/.test(skuId)) {
    notFound();
  }
  return <StockCardView skuId={Number(skuId)} />;
}
