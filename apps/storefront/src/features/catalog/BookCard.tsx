"use client";

import { useRef } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { Button } from "@slvn/ui";
import { formatPrice } from "@slvn/utils";
import type { DemoBook } from "./demo-books";
import { CATEGORIES } from "./demo-books";
import { BookCover } from "./BookCover";

export function BookCard({ book }: { book: DemoBook }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <article className="group min-w-0">
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={`Xem nhanh ${book.title}`}
        className="bg-paper relative flex w-full items-center justify-center rounded-lg px-7 py-7"
      >
        <span className="bg-background text-accent absolute top-3 left-3 rounded px-2 py-1 text-xs font-semibold">
          -20%
        </span>
        <BookCover book={book} />
      </button>
      <p className="text-muted mt-4 mb-2 text-xs font-medium tracking-wide">
        {CATEGORIES.find((category) => category.slug === book.category)?.name}
      </p>
      <h3>
        <button
          type="button"
          className="text-primary hover:text-accent min-h-12 text-left text-base leading-6 font-semibold"
          onClick={() => dialog.current?.showModal()}
        >
          {book.title}
        </button>
      </h3>
      <p className="text-muted mt-2 text-xs">
        {book.coverType === "hardcover" ? "Bìa cứng" : "Bìa mềm"} <span className="px-1">·</span> {book.publishYear}
      </p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-accent font-bold">{formatPrice(book.salePrice)}</span>
        <span className="text-muted text-xs line-through">{formatPrice(book.listPrice)}</span>
        <button
          type="button"
          aria-label={`Thông tin ${book.title}`}
          onClick={() => dialog.current?.showModal()}
          className="border-border text-primary hover:bg-primary hover:text-primary-foreground ml-auto rounded-full border p-1.5 transition-colors"
        >
          <ArrowUpRight size={16} />
        </button>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby={`book-${book.id}`}
        className="bg-background text-foreground backdrop:bg-primary/50 fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-auto rounded-xl p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <span className="text-muted text-xs font-semibold tracking-widest">THÔNG TIN SÁCH MINH HỌA</span>
          <button
            type="button"
            aria-label="Đóng thông tin sách"
            onClick={() => dialog.current?.close()}
            className="hover:bg-surface rounded p-2"
          >
            <X size={20} />
          </button>
        </div>
        <div className="grid gap-7 sm:grid-cols-[150px_1fr]">
          <BookCover book={book} />
          <div>
            <h2 id={`book-${book.id}`} className="font-editorial text-primary text-2xl font-bold">
              {book.title}
            </h2>
            <p className="text-muted mt-3 text-sm">{book.updatedToText}</p>
            <p className="text-accent mt-4 text-lg font-bold">{formatPrice(book.salePrice)}</p>
            <p className="text-muted mt-4 text-sm leading-6">
              Đây là dữ liệu minh họa để xem trước giao diện. Thông tin ấn bản, tồn kho và đặt mua sẽ được kết nối với
              backend ở bước tiếp theo.
            </p>
            <Button className="mt-5" onClick={() => dialog.current?.close()}>
              Tiếp tục xem sách
            </Button>
          </div>
        </div>
      </dialog>
    </article>
  );
}
