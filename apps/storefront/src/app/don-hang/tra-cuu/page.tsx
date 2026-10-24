import type { Metadata } from "next";
import { Container } from "@slvn/ui";
import { param } from "@/features/catalog/catalog";
import type { CatalogParams } from "@/features/catalog/catalog";
import { OrderLookup } from "@/features/ordering/OrderLookup";

export function generateMetadata(): Metadata {
  return {
    title: "Tra cứu đơn hàng",
    description: "Tra cứu tình trạng đơn hàng Sách Luật Việt Nam bằng mã đơn và số điện thoại đặt hàng.",
    alternates: { canonical: "/don-hang/tra-cuu" },
    robots: { index: false, follow: true },
  };
}

export default async function OrderLookupPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const orderCode = param(await searchParams, "ma").slice(0, 50);
  return (
    <main id="noi-dung">
      <Container className="pt-8 pb-20 sm:pt-10">
        <h1 className="font-editorial motion-rise text-[44px] leading-[1.05] font-extrabold tracking-tight sm:text-[56px]">
          Tra cứu <span className="text-gold font-medium italic">đơn hàng</span>
        </h1>
        <p className="text-sand mt-3 max-w-xl text-[15px]">
          Nhập mã đơn và số điện thoại đã dùng khi đặt hàng để xem tình trạng đơn.
        </p>
        <div className="mt-8 sm:mt-10">
          <OrderLookup defaultOrderCode={orderCode} />
        </div>
      </Container>
    </main>
  );
}
