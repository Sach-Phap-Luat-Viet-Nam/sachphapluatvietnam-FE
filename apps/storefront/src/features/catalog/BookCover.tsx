import Image from "next/image";
import { Scale } from "lucide-react";
import { cn } from "@slvn/ui";
import type { BookSummary } from "./schemas";

const COVER_COLORS = [
  "bg-book-navy text-book-sand",
  "bg-book-red text-book-sand",
  "bg-book-green text-book-sand",
  "bg-book-sand text-primary",
];

const COVER_SIZE = "h-44 w-33 sm:h-52 sm:w-39";
const COVER_FRAME =
  "border-foreground/15 relative mx-auto max-w-full shrink-0 shadow-[6px_8px_14px_-7px_var(--color-foreground)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-2deg]";

export interface BookCoverProps {
  book: Pick<BookSummary, "id" | "title" | "publishYear" | "coverImageUrl">;
}

export function BookCover({ book }: BookCoverProps) {
  if (book.coverImageUrl) {
    return (
      <Image
        src={book.coverImageUrl}
        alt={`Bìa sách ${book.title}`}
        width={156}
        height={208}
        // Chưa chốt CDN ảnh bìa nên chưa khai báo `images.remotePatterns`; bỏ tối ưu để nhận mọi URL backend trả.
        unoptimized
        className={cn(COVER_FRAME, COVER_SIZE, "object-cover")}
      />
    );
  }

  // Sách chưa có ảnh bìa: vẽ bìa thay thế từ tên sách.
  return (
    <div
      aria-hidden="true"
      className={cn(
        COVER_FRAME,
        COVER_SIZE,
        "flex flex-col items-center overflow-hidden border-l-8 px-3 py-4 text-center",
        COVER_COLORS[book.id % COVER_COLORS.length],
      )}
    >
      <span className="text-[6px] font-medium tracking-[0.15em]">TỦ SÁCH PHÁP LUẬT VIỆT NAM</span>
      <span className="mt-3 h-px w-9 bg-current opacity-50" />
      <Scale className="my-2 size-6 shrink-0 opacity-80" strokeWidth={1} />
      <span className="font-editorial line-clamp-5 text-[11px] leading-snug font-bold uppercase sm:text-[13px]">
        {book.title}
      </span>
      {book.publishYear !== null && (
        <span className="mt-auto pt-3 text-[8px] tracking-[0.2em]">{book.publishYear}</span>
      )}
    </div>
  );
}
