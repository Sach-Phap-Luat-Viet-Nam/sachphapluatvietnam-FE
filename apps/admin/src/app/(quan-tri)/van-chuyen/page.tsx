import type { Metadata } from "next";
import { ShippingManager } from "@/features/shipping/ShippingManager";

export const metadata: Metadata = { title: "Vận chuyển" };

export default function ShippingPage() {
  return <ShippingManager />;
}
