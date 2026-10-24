"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Zap } from "lucide-react";
import { cn } from "@slvn/ui";
import { fetchQuickAddBook } from "./api";
import { buyNowHref } from "./buy-now";
import { orderingErrorMessage } from "./errors";
import { pickQuickAddSku } from "./quick-add";

export interface QuickBuyButtonProps {
  slug: string;
  title: string;
  /** `icon`: nút chữ gọn cạnh nút giỏ trên thẻ sách, thông báo lỗi nổi phía trên; `full`: nút lớn trong hộp Xem nhanh. */
  variant?: "icon" | "full";
}

/**
 * "Mua ngay" từ thẻ sách: chọn SKU còn hàng rẻ nhất của ấn bản mới nhất (như `QuickAddButton`), số lượng 1, rồi sang thẳng
 * trang thanh toán, giỏ giữ nguyên (docs/features/storefront-buy-now.md). Không có SKU mua được thì mở trang chi tiết.
 */
export function QuickBuyButton({ slug, title, variant = "icon" }: QuickBuyButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      const choice = pickQuickAddSku(await fetchQuickAddBook(slug));
      router.push(choice ? buyNowHref({ slug, skuId: choice.skuId, quantity: 1 }) : `/sach/${slug}`);
    } catch (caught) {
      setError(orderingErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const spinner = busy ? <LoaderCircle size={variant === "full" ? 18 : 17} className="animate-spin" /> : null;
  const label = (
    <>
      {spinner ?? <Zap size={variant === "full" ? 18 : 17} />}
      Mua ngay
    </>
  );

  if (variant === "full") {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => void buy()}
          disabled={busy}
          className="border-gold text-gold hover:bg-gold hover:text-ink flex min-h-13.5 items-center justify-center gap-2.5 border px-6 text-base font-semibold transition-colors disabled:opacity-60"
        >
          {label}
        </button>
        <p aria-live="polite" className="text-danger min-h-6 text-sm">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void buy()}
        disabled={busy}
        aria-label={`Mua ngay ${title}`}
        className={cn(
          "border-gold text-gold hover:bg-gold hover:text-ink flex h-11 items-center justify-center gap-1.5 border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-60",
        )}
      >
        {label}
      </button>
      {/* Như QuickAddButton: thông báo nổi phía trên, rộng theo khung `relative` của dòng giá để không xê dịch lưới. */}
      <p aria-live="polite" className="absolute inset-x-0 bottom-full z-10 mb-2 text-sm">
        {error && (
          <span className="bg-panel border-gold/30 text-danger block border px-3 py-2 leading-5 shadow-[0_16px_30px_-12px_rgb(0_0_0/0.8)]">
            {error}
          </span>
        )}
      </p>
    </div>
  );
}
