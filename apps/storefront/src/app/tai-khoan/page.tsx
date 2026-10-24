import type { Metadata } from "next";
import { Container } from "@slvn/ui";
import { Account } from "@/features/account/Account";

export function generateMetadata(): Metadata {
  return { title: "Tài khoản", robots: { index: false, follow: false } };
}

export default function AccountPage() {
  return (
    <main id="noi-dung">
      <Container className="pt-8 pb-20 sm:pt-10">
        <h1 className="font-editorial motion-rise text-[44px] leading-[1.05] font-extrabold tracking-tight sm:text-[56px]">
          Tài <span className="text-gold font-medium italic">khoản</span>
        </h1>
        <div className="mt-8 sm:mt-10">
          {/* Dữ liệu cần access token trong bộ nhớ trình duyệt nên tải ở client. */}
          <Account />
        </div>
      </Container>
    </main>
  );
}
