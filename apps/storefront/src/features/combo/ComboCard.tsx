import Link from "next/link";
import { formatPrice } from "@slvn/utils";
import { ComboCovers } from "./ComboCovers";
import { comboPath, itemsSummary, originalPrice, savingsAmount, savingsPercent, totalCopies } from "./combo";
import type { Combo } from "./schemas";

/**
 * Một combo trong danh sách (trang chủ, khuyến mãi, trang sách): bìa, tên, các sách trong bộ, giá combo so với giá gốc.
 * Cả thẻ là một vùng bấm (liên kết nằm ở tên combo), nên khách vuốt/bấm đâu trên thẻ cũng mở trang combo.
 */
export function ComboCard({ combo }: { combo: Combo }) {
  const titleId = `combo-${combo.id}`;
  const percent = savingsPercent(combo);
  const saved = savingsAmount(combo);
  return (
    <li>
      <article
        aria-labelledby={titleId}
        className="border-gold/30 bg-panel hover:border-gold relative flex h-full flex-col gap-5 border p-6 transition-colors"
      >
        <ComboCovers items={combo.items} size="card" />
        <div className="flex flex-col gap-2">
          <p className="text-gold text-[11px] tracking-[0.26em] uppercase">Combo · {totalCopies(combo)} cuốn</p>
          <h3 id={titleId} className="font-editorial text-xl leading-snug font-bold">
            <Link href={comboPath(combo.slug)} className="hover:text-gold after:absolute after:inset-0">
              {combo.name}
            </Link>
          </h3>
          <p className="text-mist line-clamp-2 text-sm leading-6">{itemsSummary(combo.items)}</p>
        </div>
        <div className="mt-auto flex flex-col gap-1.5">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-gold-pale text-2xl font-semibold">{formatPrice(combo.comboPrice)}</span>
            {saved > 0 && (
              <span className="text-mist line-through">
                <span className="sr-only">Giá gốc </span>
                {formatPrice(originalPrice(combo))}
              </span>
            )}
            {percent !== null && (
              <span className="bg-burgundy text-cream px-2 py-0.5 text-sm font-semibold">
                <span className="sr-only">Tiết kiệm </span>−{percent}%
              </span>
            )}
          </p>
          {saved > 0 && <p className="text-ok text-sm">Tiết kiệm {formatPrice(saved)} so với giá gốc</p>}
        </div>
      </article>
    </li>
  );
}
