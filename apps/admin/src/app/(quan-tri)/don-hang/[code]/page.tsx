import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetail } from "@/features/orders/OrderDetail";

export const metadata: Metadata = { title: "Chi tiết đơn hàng" };

export default async function OrderPage({ params }: PageProps<"/don-hang/[code]">) {
  const { code } = await params;
  // Mã đơn dạng `SLVN2610230001`; chuỗi lạ thì 404 luôn, không gọi API. Viết hoa để `slvn…` gõ tay vẫn mở được.
  if (!/^[A-Za-z0-9-]{1,50}$/.test(code)) {
    notFound();
  }
  return <OrderDetail orderCode={code.toUpperCase()} />;
}
