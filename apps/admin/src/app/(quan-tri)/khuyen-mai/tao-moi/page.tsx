import type { Metadata } from "next";
import { PromotionCreate } from "@/features/promotion/PromotionEditor";

export const metadata: Metadata = { title: "Thêm khuyến mãi" };

export default function CreatePromotionPage() {
  return <PromotionCreate />;
}
