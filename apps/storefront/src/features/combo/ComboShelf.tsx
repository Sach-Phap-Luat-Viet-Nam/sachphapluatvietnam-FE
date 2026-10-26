import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@slvn/ui";
import { ComboCard } from "./ComboCard";
import type { Combo } from "./schemas";

/** Số combo tối đa ở trang chủ; xem đủ ở mục Combo của trang khuyến mãi. */
const HOME_COMBO_LIMIT = 3;

/** Khu "Combo tiết kiệm" ở trang chủ. Không có combo nào đang chạy (hoặc không tải được) thì không hiện gì. */
export function ComboShelf({ combos }: { combos: readonly Combo[] }) {
  if (combos.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="home-combos" className="bg-ink-deep border-gold/25 border-y">
      <Container className="flex flex-col gap-8 py-14 sm:gap-12 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-6">
          <div className="flex flex-col gap-4">
            <p className="text-gold flex items-center gap-3.5 text-xs tracking-[0.3em]">
              <span className="bg-gold h-px w-10" />
              COMBO TIẾT KIỆM
            </p>
            <h2 id="home-combos" className="font-editorial text-[34px] leading-[1.05] font-bold sm:text-[44px]">
              Mua trọn bộ, <span className="text-gold font-medium italic">giá tốt hơn</span>
            </h2>
          </div>
          <Link
            href="/khuyen-mai#combo"
            className="btn-sweep border-gold/50 hover:text-ink flex h-12 items-center gap-2.5 border px-6 text-[15px] font-medium transition-colors duration-500"
          >
            Xem tất cả combo
            <ArrowRight size={16} />
          </Link>
        </div>
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {combos.slice(0, HOME_COMBO_LIMIT).map((combo) => (
            <ComboCard key={combo.id} combo={combo} />
          ))}
        </ul>
      </Container>
    </section>
  );
}
