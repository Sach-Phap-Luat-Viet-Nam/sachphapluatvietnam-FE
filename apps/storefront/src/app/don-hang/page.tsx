import type { Metadata } from "next";
import { Container } from "@slvn/ui";
import { currentPage } from "@/features/catalog/catalog";
import type { CatalogParams } from "@/features/catalog/catalog";
import { MyOrders } from "@/features/ordering/MyOrders";

export function generateMetadata(): Metadata {
  return { title: "Đơn của tôi", robots: { index: false, follow: false } };
}

export default async function MyOrdersPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const page = currentPage(await searchParams);
  return (
    <main id="noi-dung">
      <Container className="pt-8 pb-20 sm:pt-10">
        <h1 className="font-editorial motion-rise text-[44px] leading-[1.05] font-extrabold tracking-tight sm:text-[56px]">
          Đơn <span className="text-gold font-medium italic">của tôi</span>
        </h1>
        <div className="mt-8 sm:mt-10">
          {/* Dữ liệu cần access token trong bộ nhớ trình duyệt nên tải ở client. */}
          <MyOrders page={page} />
        </div>
      </Container>
    </main>
  );
}
