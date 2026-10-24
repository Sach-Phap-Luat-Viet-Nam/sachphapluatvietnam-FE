import { Gift, Truck } from "lucide-react";
import { benefitLabel, conditionLines, validityText } from "./promotion";
import type { PublicPromotion } from "../ordering/checkout-preview";

/** Một chương trình khuyến mãi: lợi ích, mô tả, điều kiện và hạn dùng. Backend không trả mã giảm giá. */
export function PromotionCard({ promotion }: { promotion: PublicPromotion }) {
  const Icon = promotion.kind === "free_shipping" ? Truck : Gift;
  const titleId = `promotion-${promotion.id}`;
  return (
    <li>
      <article aria-labelledby={titleId} className="border-gold/30 bg-panel flex h-full flex-col gap-4 border p-6">
        <p className="text-gold flex items-center gap-2.5 text-sm font-semibold">
          <Icon size={20} strokeWidth={1.6} aria-hidden="true" /> {benefitLabel(promotion)}
        </p>
        <h2 id={titleId} className="font-editorial text-2xl leading-snug font-bold">
          {promotion.title}
        </h2>
        {promotion.description && <p className="text-mist leading-7 whitespace-pre-line">{promotion.description}</p>}
        <ul className="text-sand mt-auto flex flex-col gap-1.5 pt-2 text-[15px]">
          {conditionLines(promotion).map((line) => (
            <li key={line} className="flex gap-2.5">
              <span aria-hidden="true" className="bg-gold mt-2.5 size-1.5 shrink-0 rounded-full" />
              {line}
            </li>
          ))}
        </ul>
        <p className="border-gold/20 text-mist border-t pt-3 text-sm">{validityText(promotion)}</p>
      </article>
    </li>
  );
}
