"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Minus, Plus, X } from "lucide-react";
import { cn } from "@slvn/ui";
import { formatDiscount, formatPrice } from "@slvn/utils";
import { FORM_ERROR, SUBMIT } from "@/components/form-styles";
import { MAX_QUANTITY_PER_SKU } from "./cart";
import { orderingErrorMessage } from "./errors";
import { useAddToCart } from "./useCart";

export interface PurchaseOption {
  skuId: number;
  /** Loại bìa đã dịch, ví dụ "Bìa mềm". */
  label: string;
  salePrice: number;
  listPrice: number;
  discountPercent: number | null;
  inStock: boolean;
}

export interface AddToCartFormProps {
  /** Các SKU của ấn bản đang xem. */
  options: PurchaseOption[];
  /** Có khi đang xem ấn bản cũ: hỏi xác nhận trước khi thêm vào giỏ (US-02). */
  newerEdition: { name: string; href: string } | null;
}

function clampQuantity(value: number): number {
  return Number.isFinite(value) ? Math.min(MAX_QUANTITY_PER_SKU, Math.max(1, Math.trunc(value))) : 1;
}

/** Chọn loại bìa, số lượng và thêm vào giỏ. */
export function AddToCartForm({ options, newerEdition }: AddToCartFormProps) {
  const id = useId();
  const confirm = useRef<HTMLDialogElement>(null);
  const [skuId, setSkuId] = useState(() => (options.find((option) => option.inStock) ?? options[0])?.skuId);
  const [quantity, setQuantity] = useState(1);
  const addToCart = useAddToCart();

  const selected = options.find((option) => option.skuId === skuId);
  if (!selected) return null;
  const discount = formatDiscount(selected.discountPercent);

  const add = () => {
    confirm.current?.close();
    addToCart.mutate({ skuId: selected.skuId, quantity });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (newerEdition) {
      confirm.current?.showModal();
      return;
    }
    add();
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
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-gold-pale text-3xl font-semibold">{formatPrice(selected.salePrice)}</span>
        {selected.listPrice > selected.salePrice && (
          <span className="text-mist line-through">{formatPrice(selected.listPrice)}</span>
        )}
        {discount && <span className="bg-burgundy text-ivory px-2 py-0.5 text-sm">{discount}</span>}
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
          className="modal bg-panel text-ivory border-upcoming/50 backdrop:bg-ink/80 fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg border p-6 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)] sm:p-8"
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
              onClick={add}
              className="border-ivory/30 hover:border-gold min-h-13.5 border px-6 transition-colors sm:flex-1"
            >
              Vẫn thêm ấn bản này
            </button>
          </div>
        </dialog>
      )}
    </form>
  );
}
