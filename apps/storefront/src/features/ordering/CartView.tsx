"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Minus, Plus, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@slvn/ui";
import { formatPrice } from "@slvn/utils";
import { BookLoader } from "@/components/BookLoader";
import { FORM_ERROR, SUBMIT } from "@/components/form-styles";
import { coverTypeLabel } from "@/lib/labels";
import { MAX_QUANTITY_PER_SKU, checkoutBlocker, lineIssue } from "./cart";
import { CartLineCover } from "./CartLineCover";
import { CartSummary } from "./CartSummary";
import { orderingErrorMessage } from "./errors";
import type { CartItem } from "./schemas";
import { useCart, useRemoveCartItem, useSetCartQuantity } from "./useCart";

function CartLine({ item }: { item: CartItem }) {
  const setQuantity = useSetCartQuantity();
  const remove = useRemoveCartItem();
  const busy = setQuantity.isPending || remove.isPending;
  const issue = lineIssue(item);
  const error = setQuantity.error ?? remove.error;
  const details = [item.editionName, coverTypeLabel(item.coverType)].filter(Boolean).join(" · ");

  const change = (quantity: number) => {
    remove.reset();
    setQuantity.mutate({ skuId: item.skuId, quantity });
  };

  return (
    <li className={cn("border-gold/20 flex gap-4 border-b py-6 sm:gap-6", busy && "opacity-70")}>
      <CartLineCover title={item.bookTitle} coverImageUrl={item.coverImageUrl} skuId={item.skuId} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
          <div className="min-w-0">
            <h3 className="font-editorial text-xl leading-snug font-semibold">
              <Link href={`/sach/${item.bookSlug}`} className="hover:text-gold transition-colors">
                {item.bookTitle}
              </Link>
            </h3>
            {details && <p className="text-mist mt-1 text-sm">{details}</p>}
          </div>
          <p className="text-gold-pale text-lg font-semibold">{formatPrice(item.lineTotal)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="border-border flex h-11 items-stretch border" role="group" aria-label="Số lượng">
            <button
              type="button"
              aria-label={`Giảm số lượng ${item.bookTitle}`}
              onClick={() => change(item.quantity - 1)}
              disabled={busy || item.quantity <= 1}
              className="hover:text-gold flex w-11 items-center justify-center disabled:opacity-40"
            >
              <Minus size={16} />
            </button>
            <span aria-live="polite" className="flex w-10 items-center justify-center">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label={`Tăng số lượng ${item.bookTitle}`}
              onClick={() => change(item.quantity + 1)}
              disabled={busy || item.quantity >= MAX_QUANTITY_PER_SKU || !item.isSellable}
              className="hover:text-gold flex w-11 items-center justify-center disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>
          <span className="text-mist text-sm">
            {formatPrice(item.unitPrice)} / cuốn
            {item.listPrice > item.unitPrice && (
              <span className="ml-2 line-through">{formatPrice(item.listPrice)}</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setQuantity.reset();
              remove.mutate(item.skuId);
            }}
            disabled={busy}
            aria-label={`Xóa ${item.bookTitle} khỏi giỏ`}
            className="link-underline text-mist hover:text-gold ml-auto flex min-h-11 items-center gap-2 text-sm disabled:opacity-60"
          >
            <Trash2 size={16} /> Xóa
          </button>
        </div>

        {issue === "unsellable" && (
          <p className="text-danger flex gap-2 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            Sách này đã ngừng bán. Bạn vui lòng xóa khỏi giỏ để đặt hàng.
          </p>
        )}
        {issue === "short" && (
          <p className="text-upcoming flex gap-2 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {item.availableQuantity > 0
              ? `Chỉ còn ${item.availableQuantity} cuốn. Bạn vui lòng giảm số lượng.`
              : "Sách tạm hết hàng. Bạn vui lòng xóa khỏi giỏ hoặc quay lại sau."}
          </p>
        )}
        {!item.isLatestEdition && item.isSellable && (
          <p className="text-mist text-sm">
            Đã có ấn bản mới hơn.{" "}
            <Link href={`/sach/${item.bookSlug}`} className="link-underline text-gold">
              Xem ấn bản mới
            </Link>
          </p>
        )}
        {error && (
          <p role="alert" className="text-danger text-sm">
            {orderingErrorMessage(error)}
          </p>
        )}
      </div>
    </li>
  );
}

/** Trang giỏ hàng: sửa số lượng, xóa dòng, xem tổng tiền và sang bước thanh toán. */
export function CartView() {
  const { data: cart, error, isError, refetch, isFetching } = useCart();

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className={FORM_ERROR}>
          Chưa tải được giỏ sách. {orderingErrorMessage(error)}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="link-underline text-gold flex min-h-11 items-center gap-2"
        >
          <RefreshCw size={16} /> Thử lại
        </button>
      </div>
    );
  }

  if (!cart) {
    return <BookLoader label="Đang mở giỏ sách" />;
  }

  if (!cart.items.length) {
    return (
      <div className="border-gold/25 flex min-h-80 flex-col items-center justify-center gap-4 border px-6 text-center">
        <h2 className="font-editorial text-3xl font-bold">Giỏ sách đang trống</h2>
        <p className="text-mist">Chọn sách bạn cần trong tủ sách, rồi quay lại đây để đặt hàng.</p>
        <Link href="/sach" className={cn(SUBMIT, "mt-2 px-7")}>
          Vào tủ sách <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  const blocker = checkoutBlocker(cart);
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1fr_380px]">
      <section aria-label="Sách trong giỏ">
        <ul className="border-gold/20 border-t">
          {cart.items.map((item) => (
            <CartLine key={item.skuId} item={item} />
          ))}
        </ul>
        <Link href="/sach" className="link-underline text-gold mt-6 inline-flex min-h-11 items-center">
          Tiếp tục chọn sách
        </Link>
      </section>
      <CartSummary
        cart={cart}
        action={
          blocker ? (
            <p className="text-upcoming text-sm leading-6">{blocker}</p>
          ) : (
            <Link href="/thanh-toan" className={cn(SUBMIT, "mt-1")}>
              Đặt hàng <ArrowRight size={18} />
            </Link>
          )
        }
      />
    </div>
  );
}
