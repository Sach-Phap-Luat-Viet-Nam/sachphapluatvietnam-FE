import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container, cn } from "@slvn/ui";
import { SUBMIT } from "@/components/form-styles";
import { getActivePromotions } from "@/features/promotion/api";
import { PromotionCard } from "@/features/promotion/PromotionCard";

export function generateMetadata(): Metadata {
  return {
    title: "Khuyến mãi",
    description: "Ưu đãi, mã giảm giá và miễn phí vận chuyển đang chạy tại Sách Luật Việt Nam.",
    alternates: { canonical: "/khuyen-mai" },
    openGraph: {
      title: "Khuyến mãi | Sách Luật Việt Nam",
      description: "Ưu đãi, mã giảm giá và miễn phí vận chuyển đang chạy tại Sách Luật Việt Nam.",
      locale: "vi_VN",
      type: "website",
    },
  };
}

export default async function PromotionsPage() {
  const promotions = await getActivePromotions();
  return (
    <main id="noi-dung">
      <Container className="pt-8 pb-20 sm:pt-10">
        <nav aria-label="Đường dẫn" className="text-mist flex items-center gap-2 text-[13px]">
          <Link href="/" className="link-underline">
            Trang chủ
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Khuyến mãi</span>
        </nav>
        <h1 className="font-editorial motion-rise mt-6 text-[44px] leading-[1.05] font-extrabold tracking-tight sm:text-[56px]">
          Khuyến <span className="text-gold font-medium italic">mãi</span>
        </h1>
        <p className="text-mist mt-4 max-w-2xl leading-7">
          Ưu đãi tự động áp dụng khi thanh toán. Chương trình có mã giảm giá thì bạn nhập mã ở bước thanh toán.
        </p>

        <div className="mt-8 sm:mt-10">
          {promotions === null ? (
            <p role="alert" className="border-danger/60 text-danger border px-4 py-3 text-sm leading-6">
              Chưa tải được danh sách khuyến mãi. Bạn vui lòng tải lại trang sau ít phút.
            </p>
          ) : promotions.length === 0 ? (
            <div className="border-gold/25 flex min-h-64 flex-col items-center justify-center gap-4 border px-6 text-center">
              <h2 className="font-editorial text-3xl font-bold">Hiện chưa có khuyến mãi</h2>
              <p className="text-mist">Bạn quay lại sau nhé, hoặc xem các đầu sách đang bán.</p>
              <Link href="/sach" className={cn(SUBMIT, "mt-2 px-7")}>
                Vào tủ sách <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {promotions.map((promotion) => (
                <PromotionCard key={promotion.id} promotion={promotion} />
              ))}
            </ul>
          )}
        </div>
      </Container>
    </main>
  );
}
