import type { Metadata } from "next";
import { UserList } from "@/features/users/UserList";

export const metadata: Metadata = { title: "Nhân viên" };

export default function StaffPage() {
  return <UserList />;
}
