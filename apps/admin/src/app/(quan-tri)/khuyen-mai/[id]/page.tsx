import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PromotionEdit } from "@/features/promotion/PromotionEditor";

export const metadata: Metadata = { title: "Sửa khuyến mãi" };

export default async function PromotionPage({ params }: PageProps<"/khuyen-mai/[id]">) {
  const { id } = await params;
  // Id khuyến mãi là số nguyên dương; chuỗi khác thì 404 luôn, không gọi API.
  if (!/^[1-9]\d{0,15}$/.test(id)) {
    notFound();
  }
  return <PromotionEdit promotionId={Number(id)} />;
}
