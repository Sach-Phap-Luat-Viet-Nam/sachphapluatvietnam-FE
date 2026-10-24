import type { Metadata } from "next";
import { Container } from "@slvn/ui";
import { RegisterForm } from "@/features/auth/RegisterForm";

export function generateMetadata(): Metadata {
  return {
    title: "Đăng ký",
    description: "Tạo tài khoản Sách Luật Việt Nam để theo dõi đơn hàng và đặt sách nhanh hơn.",
    robots: { index: false, follow: true },
  };
}

export default function RegisterPage() {
  return (
    <main id="noi-dung">
      <Container className="flex justify-center py-12 sm:py-16">
        <section
          aria-labelledby="register-title"
          className="border-gold/30 bg-panel motion-rise flex w-full max-w-lg min-w-0 flex-col gap-6 border px-6 py-9 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)] sm:px-11 sm:py-11"
        >
          <h1 id="register-title" className="font-editorial text-4xl leading-tight font-bold sm:text-[40px]">
            Đăng ký
          </h1>
          <RegisterForm />
        </section>
      </Container>
    </main>
  );
}
