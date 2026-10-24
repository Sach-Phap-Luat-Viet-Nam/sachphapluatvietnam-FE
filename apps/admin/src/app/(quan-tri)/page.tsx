import type { Metadata } from "next";
import { DashboardHome } from "@/features/dashboard/DashboardHome";

export const metadata: Metadata = { title: "Tổng quan" };

export default function OverviewPage() {
  return <DashboardHome />;
}
