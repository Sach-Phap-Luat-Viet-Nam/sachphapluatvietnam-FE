import type { Metadata } from "next";
import { Container } from "@slvn/ui";
import { LoginForm } from "@/features/auth/LoginForm";

export function generateMetadata(): Metadata {
  return {
    title: "Đăng nhập",
    description: "Đăng nhập tài khoản Sách Luật Việt Nam.",
    robots: { index: false, follow: true },
  };
}

const BENEFITS = [
  "Theo dõi đơn hàng và lịch sử mua sách",
  "Giỏ sách lưu theo tài khoản, dùng trên mọi thiết bị",
  "Đặt hàng nhanh, không phải nhập lại thông tin",
];

export default function LoginPage() {
  return (
    <main id="noi-dung" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="from-gold/14 pointer-events-none absolute -bottom-72 -left-48 size-225 bg-radial-[closest-side] to-transparent"
      />
      <Container className="relative flex flex-wrap items-center gap-x-18 gap-y-12 py-12 sm:py-16">
        <section aria-label="Lợi ích khi có tài khoản" className="flex min-w-0 flex-[1_1_440px] flex-col gap-8">
          <p className="motion-rise text-gold flex items-center gap-3.5 text-xs tracking-[0.3em]">
            <span className="motion-rule bg-gold h-px w-10" />
            TÀI KHOẢN BẠN ĐỌC
          </p>
          <h2 className="font-editorial text-[44px] leading-[1.05] font-extrabold tracking-tight sm:text-[64px]">
            <span className="motion-line">
              <span className="[animation-delay:150ms]">Tủ sách của bạn,</span>
            </span>
            <span className="motion-line">
              <span className="text-gold font-medium italic [animation-delay:300ms]">luôn đúng văn bản mới.</span>
            </span>
          </h2>
          <ol className="border-gold/25 motion-rise max-w-lg border-t [animation-delay:500ms]">
            {BENEFITS.map((text, index) => (
              <li key={text} className="border-gold/25 flex items-baseline gap-5 border-b py-4">
                <span className="font-editorial text-gold text-[22px] italic">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sand">{text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="login-title"
          className="border-gold/30 bg-panel motion-rise flex w-full max-w-lg min-w-0 flex-[1_1_420px] flex-col gap-6 border px-6 py-9 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)] [animation-delay:300ms] sm:px-11 sm:py-11"
        >
          <h1 id="login-title" className="font-editorial text-4xl leading-tight font-bold sm:text-[40px]">
            Đăng nhập
          </h1>
          <LoginForm />
        </section>
      </Container>
    </main>
  );
}
