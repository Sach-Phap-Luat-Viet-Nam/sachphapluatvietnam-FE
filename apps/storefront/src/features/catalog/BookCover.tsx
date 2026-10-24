import Image from "next/image";
import { cn } from "@slvn/ui";
import type { BookSummary } from "./schemas";

const COVER_COLORS = ["bg-cover-navy", "bg-cover-wine", "bg-cover-green", "bg-cover-umber", "bg-cover-plum"];

/** Kích thước bìa 3:4 theo ngữ cảnh. */
const COVER_SIZES = {
  shelf: "h-44 w-33 sm:h-60 sm:w-45",
  dialog: "h-52 w-39",
  detail: "h-80 w-60 sm:h-104 sm:w-78",
} as const;

export interface BookCoverProps {
  book: Pick<BookSummary, "id" | "title" | "coverImageUrl">;
  size?: keyof typeof COVER_SIZES;
  className?: string;
}

const FRAME = "border-l-[10px] border-black/30 shadow-[14px_0_30px_-18px_rgb(0_0_0/0.9)]";

export function BookCover({ book, size = "shelf", className }: BookCoverProps) {
  if (book.coverImageUrl) {
    // Ảnh backend là ảnh mockup sách (đã có gáy, nền trắng, có ảnh vuông 1:1): đặt trên nền ngà và `multiply` để nền
    // trắng hòa vào nền ngà; `cover` cắt bớt lề trắng hai bên ảnh vuông (sách nằm giữa nên không mất). Bỏ gáy giả.
    return (
      <span
        className={cn(
          "bg-ivory flex p-1.5 shadow-[0_18px_30px_-16px_rgb(0_0_0/0.85)] sm:p-2",
          COVER_SIZES[size],
          className,
        )}
      >
        <Image
          src={book.coverImageUrl}
          alt={`Bìa sách ${book.title}`}
          width={180}
          height={240}
          // Chưa chốt CDN ảnh bìa nên chưa khai báo `images.remotePatterns`; bỏ tối ưu để nhận mọi URL backend trả.
          unoptimized
          className="size-full object-cover mix-blend-multiply"
        />
      </span>
    );
  }

  // Sách chưa có ảnh bìa: vẽ bìa thay thế từ tên sách, khung mạ vàng như bìa cứng.
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex p-2.5 sm:p-3.5",
        FRAME,
        COVER_COLORS[book.id % COVER_COLORS.length],
        COVER_SIZES[size],
        className,
      )}
    >
      <span className="border-gold/60 text-cover-foil flex flex-1 flex-col items-center border px-1.5 py-3 text-center sm:py-5">
        <span className="text-[6px] tracking-[0.3em] sm:text-[7px]">SÁCH LUẬT VIỆT NAM</span>
        <span className="my-3 h-px w-6 bg-current sm:my-4" />
        <span className="font-editorial line-clamp-5 text-xs leading-tight font-bold uppercase sm:text-base">
          {book.title}
        </span>
      </span>
    </span>
  );
}
