import type { Metadata } from "next";
import { CustomerList } from "@/features/users/CustomerList";

export const metadata: Metadata = { title: "Khách hàng" };

export default function CustomersPage() {
  return <CustomerList />;
}
