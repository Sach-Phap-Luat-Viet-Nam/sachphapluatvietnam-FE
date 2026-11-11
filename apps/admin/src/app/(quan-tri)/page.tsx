import type { Metadata } from "next";
import { DashboardHome } from "@/features/dashboard/DashboardHome";
import { LowStockCount } from "@/features/inventory/LowStockCount";
import { PendingOrdersCount } from "@/features/orders/PendingOrdersCount";

export const metadata: Metadata = { title: "Tổng quan" };

export default function OverviewPage() {
  return <DashboardHome workCounts={{ orders: <PendingOrdersCount />, inventory: <LowStockCount /> }} />;
}
