import type { Metadata } from "next";
import { StaffList } from "@/features/users/StaffList";

export const metadata: Metadata = { title: "Nhân viên" };

export default function StaffPage() {
  return <StaffList />;
}
