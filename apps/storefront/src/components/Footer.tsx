import Link from "next/link";
import { Container } from "@slvn/ui";
import { FooterLoginLink } from "./FooterLoginLink";

const HEADING = "text-gold text-[11px] tracking-[0.26em]";

export function Footer() {
  return (
    <footer className="border-gold/25 bg-ink-deep border-t">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-3">
          <span className="font-editorial text-2xl font-bold">
            Sách Luật <span className="text-gold italic">Việt Nam</span>
          </span>
          <p className="text-mist max-w-xs text-sm leading-6">
            Sách pháp luật do chúng tôi biên soạn, in và phát hành trực tiếp tới bạn đọc.
          </p>
        </div>
        <nav aria-label="Mua sắm" className="flex flex-col gap-2.5 text-sm">
          <span className={HEADING}>MUA SẮM</span>
          <Link href="/sach" className="link-underline w-fit">
            Tủ sách pháp luật
          </Link>
          <Link href="/sach?sort=newest" className="link-underline w-fit">
            Mới phát hành
          </Link>
          <FooterLoginLink />
        </nav>
        <div className="text-sand flex flex-col gap-2.5 text-sm">
          <span className={HEADING}>GIAO HÀNG VÀ THANH TOÁN</span>
          <span>Miễn phí vận chuyển cho đơn từ 300.000đ</span>
          <span>Thanh toán khi nhận hàng (COD) hoặc chuyển khoản</span>
        </div>
      </Container>
      <Container className="border-gold/15 text-dim border-t py-6 text-[13px]">© 2026 Sách Luật Việt Nam</Container>
    </footer>
  );
}
