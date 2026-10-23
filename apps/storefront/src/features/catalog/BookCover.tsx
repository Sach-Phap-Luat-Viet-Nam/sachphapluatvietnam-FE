import { Scale } from "lucide-react";
import { cn } from "@slvn/ui";
import type { DemoBook } from "./demo-books";

const COVER_COLORS: Record<string, string> = {
  navy: "bg-book-navy text-book-sand",
  red: "bg-book-red text-book-sand",
  green: "bg-book-green text-book-sand",
  sand: "bg-book-sand text-primary",
};

export function BookCover({ book }: { book: DemoBook }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "border-foreground/15 relative mx-auto flex aspect-3/4 w-full max-w-40 flex-col items-center border-l-8 px-4 py-5 text-center shadow-[6px_8px_14px_-7px_var(--color-foreground)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-2deg]",
        COVER_COLORS[book.cover],
      )}
    >
      <span className="text-[6px] font-medium tracking-[0.15em]">TỦ SÁCH PHÁP LUẬT VIỆT NAM</span>
      <span className="mt-3 h-px w-9 bg-current opacity-50" />
      <Scale className="my-3 size-8 shrink-0 opacity-80" strokeWidth={1} />
      <span className="font-editorial text-base leading-snug font-bold uppercase">{book.title}</span>
      <span className="mt-auto pt-3 text-[8px] tracking-[0.2em]">{book.publishYear}</span>
    </div>
  );
}
