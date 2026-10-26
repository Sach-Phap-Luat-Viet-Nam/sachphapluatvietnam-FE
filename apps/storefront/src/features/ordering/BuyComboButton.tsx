"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LoaderCircle, Zap } from "lucide-react";
import { cn } from "@slvn/ui";
import { FORM_ERROR, SUBMIT } from "@/components/form-styles";
import { addComboToCart, comboCopies } from "./buy-combo";
import type { ComboLine } from "./buy-combo";
import { orderingErrorMessage } from "./errors";
import { useAddToCart } from "./useCart";

type Phase =
  | { status: "idle" }
  | { status: "adding"; checkout: boolean }
  | { status: "added"; copies: number }
  | { status: "error"; message: string; added: number };

export interface BuyComboButtonProps {
  /** Các sách của một bộ (`items` của combo). */
  lines: readonly ComboLine[];
  /** false khi có sách trong bộ tạm ngừng bán: thay nút bằng thông báo. */
  isSellable: boolean;
}

/**
 * Mua combo: thêm đủ các sách của một bộ vào giỏ rồi ở lại trang ("Thêm combo vào giỏ") hoặc sang thanh toán ("Mua
 * ngay"). Backend tự nhận diện bộ trong giỏ và áp giá combo ở bước thanh toán nên FE chỉ thêm từng SKU, không gửi giá.
 * Một sách lỗi giữa chừng (hết hàng…) thì dừng, báo lỗi kèm số sách đã vào giỏ.
 */
export function BuyComboButton({ lines, isSellable }: BuyComboButtonProps) {
  const router = useRouter();
  const addToCart = useAddToCart();
  const [phase, setPhase] = useState<Phase>({ status: "idle" });

  if (!isSellable) {
    return <p className="text-upcoming text-lg font-medium">Combo tạm ngừng bán</p>;
  }

  const buy = async (checkout: boolean) => {
    setPhase({ status: "adding", checkout });
    const result = await addComboToCart(lines, (line) => addToCart.mutateAsync(line));
    if (result.error !== null) {
      setPhase({ status: "error", message: orderingErrorMessage(result.error), added: result.added });
      return;
    }
    if (checkout) {
      // Giữ trạng thái "đang thêm" cho tới khi chuyển trang để không bấm lần hai.
      router.push("/thanh-toan");
      return;
    }
    setPhase({ status: "added", copies: comboCopies(lines) });
  };

  const adding = phase.status === "adding";
  const addingToCart = adding && !phase.checkout;
  const addingToCheckout = adding && phase.checkout;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-stretch gap-3">
        <button
          type="button"
          onClick={() => void buy(false)}
          disabled={adding}
          className={cn(SUBMIT, "min-w-56 flex-1 px-6")}
        >
          {addingToCart ? "Đang thêm…" : "Thêm combo vào giỏ"}
          {addingToCart ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowRight size={18} />}
        </button>
        <button
          type="button"
          onClick={() => void buy(true)}
          disabled={adding}
          className="border-gold text-gold hover:bg-gold hover:text-ink flex min-h-13.5 min-w-40 flex-1 items-center justify-center gap-2.5 border px-6 text-base font-semibold transition-colors disabled:opacity-60"
        >
          {addingToCheckout ? <LoaderCircle size={18} className="animate-spin" /> : <Zap size={18} />}
          {addingToCheckout ? "Đang chuyển…" : "Mua ngay"}
        </button>
      </div>

      {phase.status === "added" && (
        <p role="status" className="border-ok/50 text-ok flex flex-wrap items-center gap-x-3 gap-y-1 border px-4 py-3">
          <Check size={17} />
          Đã thêm combo ({phase.copies} cuốn) vào giỏ.
          <Link href="/gio-hang" className="link-underline text-gold font-medium">
            Xem giỏ hàng
          </Link>
        </p>
      )}
      {phase.status === "error" && (
        <p role="alert" className={FORM_ERROR}>
          {phase.message}
          {phase.added > 0 && (
            <>
              {" "}
              Đã có {phase.added} sách của combo trong giỏ,{" "}
              <Link href="/gio-hang" className="link-underline text-gold font-medium">
                bạn kiểm tra lại giỏ hàng
              </Link>
              .
            </>
          )}
        </p>
      )}
    </div>
  );
}
