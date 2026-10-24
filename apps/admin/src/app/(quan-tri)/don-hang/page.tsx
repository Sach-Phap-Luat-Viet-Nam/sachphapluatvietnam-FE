import type { Metadata } from "next";
import { OrderList } from "@/features/orders/OrderList";

export const metadata: Metadata = { title: "Đơn hàng" };

export default function OrdersPage() {
  return <OrderList />;
}
