import type { Metadata } from "next";
import { Container } from "@slvn/ui";
import { CartView } from "@/features/ordering/CartView";

export function generateMetadata(): Metadata {
  return { title: "Giỏ sách", robots: { index: false, follow: true } };
}

export default function CartPage() {
  return (
    <main id="noi-dung">
      <Container className="pt-8 pb-20 sm:pt-10">
        <h1 className="font-editorial motion-rise text-[44px] leading-[1.05] font-extrabold tracking-tight sm:text-[56px]">
          Giỏ <span className="text-gold font-medium italic">sách</span>
        </h1>
        <div className="mt-8 sm:mt-10">
          <CartView />
        </div>
      </Container>
    </main>
  );
}
