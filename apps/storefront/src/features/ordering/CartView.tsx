"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useIsMutating } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Minus, Plus, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@slvn/ui";
import { formatPrice } from "@slvn/utils";
import { BookLoader } from "@/components/BookLoader";
import { FORM_ERROR, SUBMIT } from "@/components/form-styles";
import { coverTypeLabel } from "@/lib/labels";
import { MAX_QUANTITY_PER_SKU, checkoutBlocker, discountPercent, lineIssue, listSubtotal } from "./cart";
import { CartLineCover } from "./CartLineCover";
import { CartSummary } from "./CartSummary";
import { orderingErrorMessage } from "./errors";
import type { CartItem } from "./schemas";
import { CART_MUTATION_KEY, useCart, useRemoveCartItem, useSetCartQuantity } from "./useCart";

/** Chờ khách bấm +/− xong mới gửi số lượng cuối, thay vì mỗi lần bấm một lượt gọi API. */
const QUANTITY_DEBOUNCE_MS = 400;

function CartLine({ item }: { item: CartItem }) {
  const setQuantity = useSetCartQuantity();
  const remove = useRemoveCartItem();
  // Số khách vừa chọn, hiện ngay khi bấm; về null khi giỏ backend trả về đã khớp.
  const [draft, setDraft] = useState<number | null>(null);
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; quantity: number } | null>(null);
  const { mutate } = setQuantity;
  const { skuId } = item;

  const quantity = draft ?? item.quantity;
  const syncing = draft !== null || setQuantity.isPending;
  const issue = lineIssue(item);
  const percent = discountPercent(item.listPrice, item.unitPrice);
  const saved = (item.listPrice - item.unitPrice) * item.quantity;
  const error = setQuantity.error ?? remove.error;
  const details = [item.editionName, coverTypeLabel(item.coverType)].filter(Boolean).join(" · ");

  // Rời trang khi chưa hết thời gian chờ thì vẫn gửi số lượng khách đã chọn.
  useEffect(
    () => () => {
      const unsent = pending.current;
      if (!unsent) return;
      clearTimeout(unsent.timer);
      mutate({ skuId, quantity: unsent.quantity });
    },
    [mutate, skuId],
  );

  const change = (next: number) => {
    remove.reset();
    setDraft(next);
    if (pending.current) clearTimeout(pending.current.timer);
    const timer = setTimeout(() => {
      pending.current = null;
      mutate(
        { skuId, quantity: next },
        // Khách đã bấm tiếp trong lúc chờ thì giữ số mới hơn; lỗi thì về số của giỏ vừa tải lại.
        { onSettled: () => setDraft((current) => (current === next ? null : current)) },
      );
    }, QUANTITY_DEBOUNCE_MS);
    pending.current = { timer, quantity: next };
  };

  const removeLine = () => {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
    setDraft(null);
    setQuantity.reset();
    remove.mutate(skuId);
  };

  return (
    <li className={cn("border-gold/20 flex gap-4 border-b py-6 sm:gap-6", remove.isPending && "opacity-70")}>
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
          {/* Thành tiền luôn lấy từ backend; mờ đi trong lúc chờ giỏ mới. */}
          <div
            aria-busy={syncing}
            className={cn("flex flex-col items-start gap-0.5 transition-opacity sm:items-end", syncing && "opacity-50")}
          >
            <p className="text-gold-pale text-lg font-semibold">{formatPrice(item.lineTotal)}</p>
            {saved > 0 && (
              <p className="text-ok text-sm">
                <span className="sr-only">Giá bìa </span>
                <span className="text-mist line-through">{formatPrice(item.listPrice * item.quantity)}</span>
                <span aria-hidden="true"> · </span>
                <span>Tiết kiệm {formatPrice(saved)}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="border-border flex h-11 items-stretch border" role="group" aria-label="Số lượng">
            <button
              type="button"
              aria-label={`Giảm số lượng ${item.bookTitle}`}
              onClick={() => change(quantity - 1)}
              disabled={remove.isPending || quantity <= 1}
              className="hover:text-gold flex w-11 items-center justify-center disabled:opacity-40"
            >
              <Minus size={16} />
            </button>
            <span aria-live="polite" className="flex w-10 items-center justify-center">
              {quantity}
            </span>
            <button
              type="button"
              aria-label={`Tăng số lượng ${item.bookTitle}`}
              onClick={() => change(quantity + 1)}
              disabled={remove.isPending || quantity >= MAX_QUANTITY_PER_SKU || !item.isSellable}
              className="hover:text-gold flex w-11 items-center justify-center disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>
          <span className="text-mist text-sm">
            {formatPrice(item.unitPrice)} / cuốn
            {item.listPrice > item.unitPrice && (
              <span className="ml-2 line-through">
                <span className="sr-only">Giá bìa </span>
                {formatPrice(item.listPrice)}
              </span>
            )}
          </span>
          {percent !== null && <span className="bg-burgundy text-ivory px-2 py-0.5 text-sm">Giảm {percent}%</span>}
          <button
            type="button"
            onClick={removeLine}
            disabled={remove.isPending}
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
  const updating = useIsMutating({ mutationKey: CART_MUTATION_KEY }) > 0;

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
        listSubtotal={listSubtotal(cart.items)}
        updating={updating}
        action={
          blocker ? (
            <p className="text-upcoming text-sm leading-6">{blocker}</p>
          ) : updating ? (
            // Chờ giỏ lưu xong mới cho sang thanh toán, để đơn tạo theo đúng số lượng khách vừa chọn.
            <button type="button" disabled className={cn(SUBMIT, "mt-1")}>
              Đang cập nhật giỏ…
            </button>
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
