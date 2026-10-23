import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, Check, Scale } from "lucide-react";
import { Container } from "@slvn/ui";
import { LoginForm } from "@/features/auth/LoginForm";

export function generateMetadata(): Metadata {
  return {
    title: "Đăng nhập",
    description: "Đăng nhập tài khoản Sách Luật Việt Nam.",
    robots: { index: false, follow: true },
  };
}

export default function LoginPage() {
  return (
    <main id="noi-dung" className="bg-paper">
      <Container className="py-8 sm:py-12">
        <Link href="/sach" className="text-muted hover:text-primary mb-7 inline-flex items-center gap-2 text-sm">
          <ArrowLeft size={16} />
          Trở về tủ sách
        </Link>
        <div className="border-border bg-background mx-auto grid max-w-5xl overflow-hidden rounded-xl border lg:grid-cols-2">
          <section className="bg-primary text-primary-foreground relative hidden overflow-hidden p-12 lg:flex lg:flex-col">
            <div className="flex items-center gap-2 text-xs font-medium tracking-[0.15em]">
              <BookOpen size={19} /> SÁCH LUẬT VIỆT NAM
            </div>
            <div className="relative z-10 mt-16">
              <span className="bg-book-gold mb-7 block h-px w-12" />
              <h1 className="font-editorial text-4xl leading-[1.3]">
                Tri thức pháp luật.
                <br />
                <span className="text-book-sand italic">Giá trị bền lâu.</span>
              </h1>
              <p className="text-primary-foreground/75 mt-6 max-w-xs text-sm leading-7">
                Một tài khoản, một tủ sách của riêng bạn. Tiếp nối hành trình khám phá và ứng dụng pháp luật mỗi ngày.
              </p>
              <ul className="mt-9 space-y-4 text-sm">
                {["Thuận tiện theo dõi đơn hàng", "Lưu giỏ sách theo tài khoản", "An tâm trên hành trình học hỏi"].map(
                  (text) => (
                    <li key={text} className="flex items-center gap-3">
                      <Check size={16} className="text-book-sand" />
                      {text}
                    </li>
                  ),
                )}
              </ul>
            </div>
            <Scale
              aria-hidden="true"
              className="text-primary-foreground/5 absolute -right-10 -bottom-8 size-72"
              strokeWidth={0.6}
            />
            <p className="text-primary-foreground/50 relative mt-auto pt-16 text-xs">HIỂU LUẬT ĐỂ VỮNG BƯỚC</p>
          </section>
          <section aria-labelledby="login-title" className="px-6 py-10 sm:px-12 sm:py-14">
            <p className="text-accent text-xs font-semibold tracking-[0.15em]">CHÀO MỪNG BẠN TRỞ LẠI</p>
            <h2 id="login-title" className="font-editorial text-primary mt-3 text-4xl">
              Đăng nhập
            </h2>
            <p className="text-muted mt-3 text-sm leading-6">Tiếp tục hành trình cùng Sách Luật Việt Nam.</p>
            <LoginForm />
          </section>
        </div>
      </Container>
    </main>
  );
}
