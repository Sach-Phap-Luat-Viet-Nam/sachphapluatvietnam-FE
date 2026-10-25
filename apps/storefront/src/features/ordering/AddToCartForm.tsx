"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, Minus, Plus, X, Zap } from "lucide-react";
import { cn } from "@slvn/ui";
import { formatDateTime, formatDiscount, formatPrice } from "@slvn/utils";
import { FORM_ERROR, SUBMIT } from "@/components/form-styles";
import { buyNowHref } from "./buy-now";
import { MAX_QUANTITY_PER_SKU } from "./cart";
import { orderingErrorMessage } from "./errors";
import { useAddToCart } from "./useCart";

export interface PurchaseOption {
  skuId: number;
  /** Loại bìa đã dịch, ví dụ "Bìa mềm". */
  label: string;
  /** Giá đang áp dụng (đã gồm khuyến mãi). */
  salePrice: number;
  /** Giá bìa. */
  listPrice: number;
  /** Giá bán thường khi hết khuyến mãi, `null` khi không có. */
  regularSalePrice: number | null;
  discountPercent: number | null;
  /** Hạn khuyến mãi (ISO UTC), `null` khi không hẹn giờ. */
  saleEndsAt: string | null;
  inStock: boolean;
}

export interface AddToCartFormProps {
  /** Slug của sách, mang sang trang thanh toán khi bấm "Mua ngay". */
  bookSlug: string;
  /** Các SKU của ấn bản đang xem. */
  options: PurchaseOption[];
  /** Có khi đang xem ấn bản cũ: hỏi xác nhận trước khi thêm vào giỏ hoặc mua ngay (US-02). */
  newerEdition: { name: string; href: string } | null;
}

/** Thao tác khách bấm khi đang xem ấn bản cũ, chờ xác nhận trong dialog. */
type PendingAction = "add" | "buy";

function clampQuantity(value: number): number {
  return Number.isFinite(value) ? Math.min(MAX_QUANTITY_PER_SKU, Math.max(1, Math.trunc(value))) : 1;
}

/**
 * Chọn loại bìa, số lượng rồi thêm vào giỏ, hoặc "Mua ngay": sang thẳng trang thanh toán với đúng lựa chọn đó, giỏ giữ
 * nguyên (docs/features/storefront-buy-now.md).
 */
export function AddToCartForm({ bookSlug, options, newerEdition }: AddToCartFormProps) {
  const id = useId();
  const router = useRouter();
  const confirm = useRef<HTMLDialogElement>(null);
  const [skuId, setSkuId] = useState(() => (options.find((option) => option.inStock) ?? options[0])?.skuId);
  const [quantity, setQuantity] = useState(1);
  const [pendingAction, setPendingAction] = useState<PendingAction>("add");
  const addToCart = useAddToCart();

  const selected = options.find((option) => option.skuId === skuId);
  if (!selected) return null;
  const discount = formatDiscount(selected.discountPercent);
  // Giá thường chỉ hiện khi đang khuyến mãi và khác giá bìa (giá bìa đã gạch ngang ở trên).
  const regular = selected.regularSalePrice;
  const regularPrice =
    regular !== null && regular > selected.salePrice && regular !== selected.listPrice ? regular : null;
  const saleEnds = formatDateTime(selected.saleEndsAt);
  const checkoutHref = buyNowHref({ slug: bookSlug, skuId: selected.skuId, quantity });

  const add = () => {
    confirm.current?.close();
    addToCart.mutate({ skuId: selected.skuId, quantity });
  };

  const askToConfirm = (action: PendingAction) => {
    setPendingAction(action);
    confirm.current?.showModal();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (newerEdition) {
      askToConfirm("add");
      return;
    }
    add();
  };

  // "Mua ngay" là link thường (mở tab mới, F5 vẫn được); chỉ chặn lại để hỏi khi đang xem ấn bản cũ.
  const onBuyNow = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!newerEdition) return;
    event.preventDefault();
    askToConfirm("buy");
  };

  const confirmOldEdition = () => {
    if (pendingAction === "add") {
      add();
      return;
    }
    confirm.current?.close();
    router.push(checkoutHref);
  };

  const choose = (next: number) => {
    setSkuId(next);
    addToCart.reset();
  };

  const changeQuantity = (next: number) => {
    setQuantity(clampQuantity(next));
    addToCart.reset();
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-gold-pale text-3xl font-semibold">{formatPrice(selected.salePrice)}</span>
          {selected.listPrice > selected.salePrice && (
            <span className="text-mist line-through">
              <span className="sr-only">Giá bìa </span>
              {formatPrice(selected.listPrice)}
            </span>
          )}
          {discount && <span className="bg-burgundy text-cream px-2 py-0.5 text-sm font-semibold">{discount}</span>}
        </div>
        {(regularPrice !== null || saleEnds) && (
          <p className="text-sand text-sm">
            {regularPrice !== null && <>Giá thường {formatPrice(regularPrice)}</>}
            {regularPrice !== null && saleEnds && " · "}
            {saleEnds && <span className="text-upcoming">Giá ưu đãi đến {saleEnds}</span>}
          </p>
        )}
      </div>

      {options.length > 1 && (
        <fieldset className="flex flex-col gap-2.5">
          <legend className="text-gold mb-2.5 text-[11px] tracking-[0.26em] uppercase">Loại bìa</legend>
          <div className="flex flex-wrap gap-2.5">
            {options.map((option) => (
              <label
                key={option.skuId}
                className={cn(
                  "has-focus-visible:outline-gold flex min-h-12 cursor-pointer flex-col justify-center border px-4 py-2 text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-4",
                  option.skuId === selected.skuId ? "border-gold bg-gold/12" : "border-border hover:border-gold",
                  !option.inStock && "text-mist",
                )}
              >
                <input
                  type="radio"
                  name={`${id}-sku`}
                  value={option.skuId}
                  checked={option.skuId === selected.skuId}
                  onChange={() => choose(option.skuId)}
                  className="sr-only"
                />
                <span className="font-medium">{option.label}</span>
                <span className="text-mist">
                  {formatPrice(option.salePrice)}
                  {!option.inStock && " · Tạm hết hàng"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap items-stretch gap-3">
        <div className="border-border flex h-13.5 items-stretch border">
          <button
            type="button"
            aria-label="Giảm số lượng"
            onClick={() => changeQuantity(quantity - 1)}
            disabled={quantity <= 1}
            className="hover:text-gold flex w-12 items-center justify-center disabled:opacity-40"
          >
            <Minus size={17} />
          </button>
          <label htmlFor={`${id}-quantity`} className="sr-only">
            Số lượng
          </label>
          <input
            id={`${id}-quantity`}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_QUANTITY_PER_SKU}
            value={quantity}
            onChange={(event) => changeQuantity(event.target.valueAsNumber)}
            className="w-14 [appearance:textfield] bg-transparent text-center text-base [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            aria-label="Tăng số lượng"
            onClick={() => changeQuantity(quantity + 1)}
            disabled={quantity >= MAX_QUANTITY_PER_SKU}
            className="hover:text-gold flex w-12 items-center justify-center disabled:opacity-40"
          >
            <Plus size={17} />
          </button>
        </div>
        <button
          type="submit"
          disabled={!selected.inStock || addToCart.isPending}
          className={cn(SUBMIT, "min-w-56 flex-1 px-6")}
        >
          {!selected.inStock ? "Tạm hết hàng" : addToCart.isPending ? "Đang thêm…" : "Thêm vào giỏ"}
          {selected.inStock && <ArrowRight size={18} />}
        </button>
        {selected.inStock && (
          <Link
            href={checkoutHref}
            onClick={onBuyNow}
            className="border-gold text-gold hover:bg-gold hover:text-ink flex min-h-13.5 min-w-40 flex-1 items-center justify-center gap-2.5 border px-6 text-base font-semibold transition-colors"
          >
            <Zap size={18} /> Mua ngay
          </Link>
        )}
      </div>
      <p className="text-mist text-sm">Tối đa {MAX_QUANTITY_PER_SKU} cuốn mỗi loại cho một đơn hàng.</p>

      {addToCart.isSuccess && (
        <p role="status" className="border-ok/50 text-ok flex flex-wrap items-center gap-x-3 gap-y-1 border px-4 py-3">
          <Check size={17} />
          Đã thêm {addToCart.variables.quantity} cuốn vào giỏ.
          <Link href="/gio-hang" className="link-underline text-gold font-medium">
            Xem giỏ hàng
          </Link>
        </p>
      )}
      {addToCart.isError && (
        <p role="alert" className={FORM_ERROR}>
          {orderingErrorMessage(addToCart.error)}
        </p>
      )}

      {newerEdition && (
        <dialog
          ref={confirm}
          aria-labelledby={`${id}-confirm-title`}
          className="modal bg-panel text-ivory border-upcoming/50 backdrop:bg-scrim/75 fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg border p-6 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)] sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id={`${id}-confirm-title`} className="font-editorial flex gap-3 text-2xl leading-tight font-bold">
              <AlertTriangle size={24} className="text-upcoming mt-1 shrink-0" />
              Đã có ấn bản mới
            </h2>
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => confirm.current?.close()}
              className="hover:text-gold -m-2 p-2"
            >
              <X size={22} />
            </button>
          </div>
          <p className="text-sand mt-4 leading-7">
            Bạn đang chọn ấn bản cũ. Ấn bản <strong className="text-ivory">{newerEdition.name}</strong> cập nhật văn bản
            pháp luật mới hơn.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
            <Link href={newerEdition.href} className={cn(SUBMIT, "px-6 sm:flex-1")}>
              Xem ấn bản mới
            </Link>
            <button
              type="button"
              onClick={confirmOldEdition}
              className="border-ivory/30 hover:border-gold min-h-13.5 border px-6 transition-colors sm:flex-1"
            >
              {pendingAction === "add" ? "Vẫn thêm ấn bản này" : "Vẫn mua ấn bản này"}
            </button>
          </div>
        </dialog>
      )}
    </form>
  );
}
