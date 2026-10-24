import type { Metadata } from "next";
import { AcceptImpersonation } from "@/features/users/AcceptImpersonation";

export const metadata: Metadata = { title: "Đăng nhập hộ" };

export default function ImpersonationPage() {
  return <AcceptImpersonation />;
}
