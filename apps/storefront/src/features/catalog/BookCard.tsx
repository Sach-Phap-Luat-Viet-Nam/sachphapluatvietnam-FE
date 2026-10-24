"use client";

import { useRef } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@slvn/ui";
import { formatDiscount, formatPrice } from "@slvn/utils";
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
}

function BookPrice({ book }: BookCardProps) {
  if (book.salePrice === null) return null;
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className="text-lg font-semibold">{formatPrice(book.salePrice)}</span>
      {book.listPrice !== null && book.listPrice > book.salePrice && (
        <span className="text-mist text-sm line-through">{formatPrice(book.listPrice)}</span>
      )}
    </span>
  );
}

export function BookCard({ book }: BookCardProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const discount = formatDiscount(book.discountPercent);
  const status = availability(book);
  const isUpcoming = status.tone === "upcoming";
  const badge = discount ? `Giảm ${discount.slice(1)}` : isUpcoming ? status.label : null;
  const dimmed = !book.inStock && !isUpcoming;
  const edition = [book.editionName, book.publishYear].filter((value) => value !== null && value !== "").join(" · ");
  const open = () => dialog.current?.showModal();

  return (
    <article className="shelf-card motion-reveal flex h-full min-w-0 flex-col">
      <button
        type="button"
        onClick={open}
        aria-label={`Xem nhanh ${book.title}`}
        className="border-gold/50 relative flex h-50 items-end justify-center border-b shadow-[0_14px_18px_-16px_rgb(0_0_0/0.9)] sm:h-68"
      >
        <span className={cn("shelf-book block", dimmed && "opacity-55")}>
          <BookCover book={book} />
        </span>
        <span className="quick-tag bg-gold text-ink absolute bottom-4 px-3.5 py-2 text-sm font-semibold">
          Xem nhanh
        </span>
        {badge && (
          <span
            className={cn(
              "absolute top-3 left-0 px-2.5 py-1 text-xs font-medium",
              discount ? "bg-burgundy text-ivory" : "bg-gold text-ink",
            )}
          >
            {badge}
          </span>
        )}
      </button>
      <p className="text-gold mt-4 text-[11px] tracking-[0.24em] uppercase">{bookTypeLabel(book.bookType)}</p>
      <h3 className="font-editorial mt-1 text-lg leading-snug font-bold sm:text-[22px]">
        {/* Tên dài cắt ở 3 dòng để các thẻ cùng hàng thẳng nhau; tên đầy đủ có trong Xem nhanh. */}
        <button type="button" onClick={open} className="hover:text-gold line-clamp-3 text-left transition-colors">
          {book.title}
        </button>
      </h3>
      {edition && <p className="text-mist mt-1 text-sm">{edition}</p>}
      {book.updatedToText && (
        <p className="text-sand mt-2 flex gap-2 text-sm">
          <Check size={15} strokeWidth={2} className="text-gold mt-1 shrink-0" />
          {book.updatedToText}
        </p>
      )}
      {/* Giá luôn ở đáy thẻ để thẳng hàng giữa các thẻ có tên dài ngắn khác nhau. */}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-3">
        <BookPrice book={book} />
        {status.tone !== "ok" && <span className={cn("text-sm", TONE_CLASSES[status.tone])}>{status.label}</span>}
      </div>

      <dialog
        ref={dialog}
        aria-labelledby={`book-${book.id}`}
        className="bg-panel text-ivory border-gold/30 backdrop:bg-ink/80 fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-auto border p-6 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)] sm:p-8"
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
            <p className="text-gold text-[11px] tracking-[0.24em] uppercase">{bookTypeLabel(book.bookType)}</p>
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
          </div>
        </div>
      </dialog>
    </article>
  );
}
