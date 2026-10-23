import { BookOpen, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Container } from "@slvn/ui";

export function Footer() {
  return (
    <footer className="border-border bg-paper border-t">
      <Container className="flex flex-col justify-between gap-6 py-10 sm:flex-row sm:items-center">
        <div>
          <div className="text-primary mb-2 flex items-center gap-2 font-bold">
            <BookOpen size={21} /> SÁCH LUẬT VIỆT NAM
          </div>
          <p className="text-muted text-sm">Đồng hành cùng bạn trên hành trình hiểu luật.</p>
        </div>
        <Link href="/sach" className="text-primary flex items-center gap-2 text-sm font-medium">
          Khám phá tủ sách <ArrowUpRight size={17} />
        </Link>
      </Container>
      <Container className="border-border text-muted border-t py-5 text-xs">
        © 2026 Sách Luật Việt Nam. Giao diện xem trước · Dữ liệu sách minh họa.
      </Container>
    </footer>
  );
}
