import type { Metadata } from "next";
import { Container } from "@slvn/ui";
import { AcceptImpersonation } from "@/features/impersonation/AcceptImpersonation";

export function generateMetadata(): Metadata {
  return { title: "Đăng nhập hộ", robots: { index: false, follow: false } };
}

export default function ImpersonationPage() {
  return (
    <main id="noi-dung">
      <Container className="flex min-h-80 flex-col justify-center gap-4 py-16">
        <h1 className="font-editorial text-4xl font-bold">Đăng nhập hộ</h1>
        <AcceptImpersonation />
      </Container>
    </main>
  );
}
