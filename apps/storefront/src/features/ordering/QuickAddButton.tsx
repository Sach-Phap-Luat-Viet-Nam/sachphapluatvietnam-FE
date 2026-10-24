"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, ShoppingCart } from "lucide-react";
import { cn } from "@slvn/ui";
import { SUBMIT } from "@/components/form-styles";
import { coverTypeLabel } from "@/lib/labels";
import { fetchQuickAddBook } from "./api";
import { orderingErrorMessage } from "./errors";
import { pickQuickAddSku } from "./quick-add";
import { useAddToCart } from "./useCart";

/** Thời gian giữ trạng thái "Đã thêm" trước khi nút trở lại bình thường. */
const ADDED_MS = 3500;

type Phase =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "added"; cover: string }
  | { status: "error"; message: string };

export interface QuickAddButtonProps {
  slug: string;
  title: string;
  /** `icon`: nút vuông trên thẻ sách, thông báo nổi phía trên; `full`: nút lớn trong hộp Xem nhanh. */
  variant?: "icon" | "full";
}

/**
 * Thêm nhanh 1 cuốn vào giỏ từ thẻ sách: đọc SKU của ấn bản mới nhất, chọn SKU còn hàng rẻ nhất. Không có SKU mua được
 * (vừa hết hàng, ngừng bán) thì mở trang chi tiết để khách xem.
 */
export function QuickAddButton({ slug, title, variant = "icon" }: QuickAddButtonProps) {
  const router = useRouter();
  const addToCart = useAddToCart();
  const [phase, setPhase] = useState<Phase>({ status: "idle" });

  useEffect(() => {
    if (phase.status !== "added") return;
    const timer = window.setTimeout(() => setPhase({ status: "idle" }), ADDED_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const add = async () => {
    setPhase({ status: "loading" });
    try {
      const choice = pickQuickAddSku(await fetchQuickAddBook(slug));
      if (!choice) {
        setPhase({ status: "idle" });
        router.push(`/sach/${slug}`);
        return;
      }
      await addToCart.mutateAsync({ skuId: choice.skuId, quantity: 1 });
      setPhase({ status: "added", cover: coverTypeLabel(choice.coverType) });
    } catch (error) {
      setPhase({ status: "error", message: orderingErrorMessage(error) });
    }
  };

  const busy = phase.status === "loading";
  const feedback =
    phase.status === "added" ? (
      <span className="text-ok">
        Đã thêm 1 cuốn ({phase.cover.toLowerCase()}) vào giỏ.{" "}
        <Link href="/gio-hang" className="text-gold underline underline-offset-2">
          Xem giỏ
        </Link>
      </span>
    ) : phase.status === "error" ? (
      <span className="text-danger">{phase.message}</span>
    ) : null;

  if (variant === "full") {
    return (
      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => void add()} disabled={busy} className={cn(SUBMIT, "px-6")}>
          {busy ? <LoaderCircle size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
          {busy ? "Đang thêm…" : "Thêm vào giỏ"}
        </button>
        <p aria-live="polite" className="min-h-6 text-sm">
          {feedback}
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void add()}
        disabled={busy}
        aria-label={`Thêm ${title} vào giỏ`}
        className={cn(
          "flex size-11 items-center justify-center border transition-colors disabled:opacity-60",
          phase.status === "added"
            ? "border-ok text-ok"
            : "border-gold/60 text-gold hover:bg-gold hover:text-ink hover:border-gold",
        )}
      >
        {busy ? (
          <LoaderCircle size={19} className="animate-spin" />
        ) : phase.status === "added" ? (
          <Check size={19} />
        ) : (
          <ShoppingCart size={19} strokeWidth={1.8} />
        )}
      </button>
      {/* Thông báo luôn có trong DOM cho trình đọc màn hình; nổi phía trên, rộng theo khung `relative` bao ngoài (dòng giá của thẻ sách) để không tràn khỏi màn hình hay xê dịch lưới. */}
      <p aria-live="polite" className="absolute inset-x-0 bottom-full z-10 mb-2 text-sm">
        {feedback && (
          <span className="bg-panel border-gold/30 block border px-3 py-2 leading-5 shadow-[0_16px_30px_-12px_rgb(0_0_0/0.8)]">
            {feedback}
          </span>
        )}
      </p>
    </div>
  );
}
