import type { Metadata } from "next";
import { Container } from "@slvn/ui";
import { parseBuyNowParams } from "@/features/ordering/buy-now";
import { Checkout } from "@/features/ordering/Checkout";

interface CheckoutPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function generateMetadata(): Metadata {
  return { title: "Đặt hàng", robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  // `?mua-ngay=…` từ nút "Mua ngay" ở trang sách: đặt một SKU, không dùng giỏ.
  const buyNow = parseBuyNowParams(await searchParams);
  return (
    <main id="noi-dung">
      <Container className="pt-8 pb-20 sm:pt-10">
        <h1 className="font-editorial motion-rise text-[44px] leading-[1.05] font-extrabold tracking-tight sm:text-[56px]">
          Đặt <span className="text-gold font-medium italic">hàng</span>
        </h1>
        <div className="mt-8 sm:mt-10">
          <Checkout buyNow={buyNow} />
        </div>
      </Container>
    </main>
  );
}
