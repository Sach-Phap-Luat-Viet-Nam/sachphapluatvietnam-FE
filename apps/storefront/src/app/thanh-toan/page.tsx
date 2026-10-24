import type { Metadata } from "next";
import { Container } from "@slvn/ui";
import { Checkout } from "@/features/ordering/Checkout";

export function generateMetadata(): Metadata {
  return { title: "Đặt hàng", robots: { index: false, follow: false } };
}

export default function CheckoutPage() {
  return (
    <main id="noi-dung">
      <Container className="pt-8 pb-20 sm:pt-10">
        <h1 className="font-editorial motion-rise text-[44px] leading-[1.05] font-extrabold tracking-tight sm:text-[56px]">
          Đặt <span className="text-gold font-medium italic">hàng</span>
        </h1>
        <div className="mt-8 sm:mt-10">
          <Checkout />
        </div>
      </Container>
    </main>
  );
}
