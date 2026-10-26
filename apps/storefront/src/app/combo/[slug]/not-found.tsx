import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@slvn/ui";

export default function ComboNotFound() {
  return (
    <main id="noi-dung">
      <Container className="flex min-h-112 flex-col items-center justify-center gap-5 py-20 text-center">
        <span className="font-editorial text-gold text-7xl italic">404</span>
        <h1 className="font-editorial text-4xl font-bold">Không tìm thấy combo</h1>
        <p className="text-mist max-w-md">Combo có thể đã hết thời gian áp dụng hoặc tạm ngừng bán.</p>
        <Link
          href="/khuyen-mai"
          className="btn-sweep bg-gold text-ink flex h-12 items-center gap-2.5 px-7 font-semibold"
        >
          Xem các ưu đãi đang chạy <ArrowRight size={17} />
        </Link>
      </Container>
    </main>
  );
}
