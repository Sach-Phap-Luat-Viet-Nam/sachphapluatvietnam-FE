"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { cn } from "@slvn/ui";
import { formatDateTime, formatDiscount, formatPrice } from "@slvn/utils";
import { bookPath } from "./book-detail";
import { availability, bookTypeLabel } from "./catalog";
import type { AvailabilityTone } from "./catalog";
import type { BookSummary } from "./schemas";
import { BookCover } from "./BookCover";

const TONE_CLASSES: Record<AvailabilityTone, string> = {
  ok: "text-ok",
  upcoming: "text-upcoming",
  muted: "text-mist",
};

export interface BookCardProps {
  book: BookSummary;
  /** Số thứ tự hiển thị cạnh loại sách (`01`, `02`, …), dùng khi thẻ nằm trong một dãy có thứ tự. */
  index?: number;
  /** Nút thêm nhanh vào giỏ ở đáy thẻ (trang truyền vào từ feature ordering); chỉ hiện khi sách còn hàng. */
  cartAction?: ReactNode;
  /** Nút thêm vào giỏ trong hộp Xem nhanh. */
  dialogCartAction?: ReactNode;
}

function BookPrice({ book }: Pick<BookCardProps, "book">) {
  if (book.salePrice === null) return null;
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className="text-gold-pale text-xl font-semibold">{formatPrice(book.salePrice)}</span>
      {book.listPrice !== null && book.listPrice > book.salePrice && (
        <span className="text-mist text-sm line-through">{formatPrice(book.listPrice)}</span>
      )}
    </span>
  );
}

export function BookCard({ book, index, cartAction, dialogCartAction }: BookCardProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const discount = formatDiscount(book.discountPercent);
  const saleEnds = formatDateTime(book.saleEndsAt);
  const status = availability(book);
  const isUpcoming = status.tone === "upcoming";
  const badge = discount ? `Giảm ${discount.slice(1)}` : isUpcoming ? status.label : null;
  const dimmed = !book.inStock && !isUpcoming;
  const edition = [book.editionName, book.publishYear].filter((value) => value !== null && value !== "").join(" · ");
  const open = () => dialog.current?.showModal();
  const buyable = status.tone === "ok";
  // Hiện mã SKU để khách đối chiếu khi đặt mua; chưa có thì dùng loại sách.
  const tag = book.skuCode || bookTypeLabel(book.bookType);

  return (
    <article className="shelf-card motion-reveal flex h-full min-w-0 flex-col">
      <button
        type="button"
        onClick={open}
        aria-label={`Xem nhanh ${book.title}`}
        className="relative flex h-50 items-end justify-center shadow-[0_14px_18px_-16px_rgb(0_0_0/0.9)] sm:h-68"
      >
        <span
          aria-hidden="true"
          className="shelf-glow from-gold/35 absolute bottom-0 left-1/2 h-4/5 w-full -translate-x-1/2 bg-radial-[closest-side] to-transparent"
        />
        <span
          aria-hidden="true"
          className="via-gold/80 absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent to-transparent"
        />
        <span className={cn("shelf-book relative block", dimmed && "opacity-55")}>
          <BookCover book={book} />
        </span>
        <span className="quick-tag bg-gold text-ink absolute bottom-4 px-3.5 py-2 text-sm font-semibold">
          Xem nhanh
        </span>
        {badge && (
          <span
            className={cn(
              "absolute top-3 left-0 px-2.5 py-1 text-xs font-medium",
              discount ? "bg-burgundy text-cream" : "bg-gold text-ink",
            )}
          >
            {badge}
          </span>
        )}
      </button>
      <p className="text-gold-pale mt-5 flex items-center gap-3 text-xs font-medium tracking-[0.16em] uppercase">
        {index !== undefined && (
          <>
            <span className="font-editorial text-gold text-lg leading-none tracking-normal italic">
              {String(index).padStart(2, "0")}
            </span>
            <span aria-hidden="true" className="bg-gold/50 h-px w-5" />
          </>
        )}
        {tag}
      </p>
      <h3 className="font-editorial mt-2.5 text-xl leading-[1.4] font-semibold sm:text-[21px]">
        {/* Tên dài cắt ở 3 dòng để các thẻ cùng hàng thẳng nhau; tên đầy đủ có trong Xem nhanh. */}
        <button type="button" onClick={open} className="hover:text-gold line-clamp-3 text-left transition-colors">
          {book.title}
        </button>
      </h3>
      {edition && <p className="text-mist mt-1.5 text-sm">{edition}</p>}
      {book.updatedToText && (
        <p className="text-sand mt-2.5 flex gap-2 text-sm leading-6">
          <Check size={15} strokeWidth={2} className="text-gold mt-1 shrink-0" />
          {book.updatedToText}
        </p>
      )}
      {/* Giá luôn ở đáy thẻ để thẳng hàng giữa các thẻ có tên dài ngắn khác nhau. */}
      <div className="mt-auto pt-4">
        <div className="border-ivory/10 relative flex flex-col gap-3 border-t pt-4">
          <BookPrice book={book} />
          {buyable ? cartAction : <span className={cn("text-sm", TONE_CLASSES[status.tone])}>{status.label}</span>}
        </div>
      </div>

      <dialog
        ref={dialog}
        aria-labelledby={`book-${book.id}`}
        className="modal bg-panel text-ivory border-gold/30 backdrop:bg-scrim/75 fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-auto border p-6 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)] sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="text-gold text-xs tracking-[0.3em]">XEM NHANH</span>
          <button
            type="button"
            aria-label="Đóng thông tin sách"
            onClick={() => dialog.current?.close()}
            className="hover:text-gold -m-2 p-2"
          >
            <X size={22} />
          </button>
        </div>
        <div className="grid gap-8 sm:grid-cols-[156px_1fr]">
          <BookCover book={book} size="dialog" className="mx-auto" />
          <div>
            <p className="text-gold text-[11px] tracking-[0.24em] uppercase">{tag}</p>
            <h2 id={`book-${book.id}`} className="font-editorial mt-2 text-3xl leading-tight font-bold">
              {book.title}
            </h2>
            {edition && <p className="text-mist mt-2 text-sm">{edition}</p>}
            {book.updatedToText && (
              <p className="text-sand mt-4 flex gap-2 text-sm">
                <Check size={15} strokeWidth={2} className="text-gold mt-1 shrink-0" />
                {book.updatedToText}
              </p>
            )}
            <div className="border-gold/25 mt-6 flex flex-wrap items-end justify-between gap-3 border-t pt-5">
              <BookPrice book={book} />
              <span className={cn("text-sm", TONE_CLASSES[status.tone])}>{status.label}</span>
            </div>
            {saleEnds && <p className="text-upcoming mt-2 text-sm">Giá ưu đãi đến {saleEnds}</p>}
            {buyable && dialogCartAction ? (
              <div className="mt-6 flex flex-col gap-3">
                {dialogCartAction}
                <Link
                  href={bookPath(book.slug)}
                  className="border-ivory/40 text-ivory hover:border-gold hover:text-gold bg-ivory/5 flex min-h-12 items-center justify-center gap-2.5 border px-6 text-base font-semibold transition-colors"
                >
                  Xem chi tiết sách <ArrowRight size={17} />
                </Link>
              </div>
            ) : (
              <Link
                href={bookPath(book.slug)}
                className="btn-sweep bg-gold text-ink mt-6 flex min-h-12 items-center justify-center gap-2.5 px-6 font-semibold"
              >
                {buyable ? "Xem chi tiết và đặt mua" : "Xem chi tiết"} <ArrowRight size={17} />
              </Link>
            )}
          </div>
        </div>
      </dialog>
    </article>
  );
}
