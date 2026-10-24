import type { Metadata } from "next";
import { PromotionList } from "@/features/promotion/PromotionList";

export const metadata: Metadata = { title: "Khuyến mãi" };

export default function PromotionsPage() {
  return <PromotionList />;
}
