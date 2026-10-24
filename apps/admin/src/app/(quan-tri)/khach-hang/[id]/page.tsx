import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomerDetail } from "@/features/users/CustomerDetail";

export const metadata: Metadata = { title: "Chi tiết khách hàng" };

export default async function CustomerPage({ params }: PageProps<"/khach-hang/[id]">) {
  const { id } = await params;
  // Id khách là số nguyên dương; chuỗi khác thì 404 luôn, không gọi API.
  if (!/^[1-9]\d{0,15}$/.test(id)) {
    notFound();
  }
  return <CustomerDetail customerId={Number(id)} />;
}
