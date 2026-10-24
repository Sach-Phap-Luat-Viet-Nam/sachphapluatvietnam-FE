import Image from "next/image";
import { cn } from "@slvn/ui";

const COVER_COLORS = ["bg-cover-navy", "bg-cover-wine", "bg-cover-green", "bg-cover-umber", "bg-cover-plum"];

export interface CartLineCoverProps {
  title: string;
  coverImageUrl: string | null;
  skuId: number;
}

/** Ảnh bìa nhỏ 3:4 của một dòng giỏ; chưa có ảnh thì hiện khối màu như bìa thay thế ở tủ sách. */
export function CartLineCover({ title, coverImageUrl, skuId }: CartLineCoverProps) {
  if (coverImageUrl) {
    return (
      <span className="bg-cream flex h-24 w-18 shrink-0 p-1 sm:h-32 sm:w-24">
        <Image
          src={coverImageUrl}
          alt={`Bìa sách ${title}`}
          width={96}
          height={128}
          // Như BookCover: chưa chốt CDN ảnh bìa nên chưa khai báo `images.remotePatterns`.
          unoptimized
          className="size-full object-cover mix-blend-multiply"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "border-gold/40 flex h-24 w-18 shrink-0 border-l-[6px] border-l-black/30 sm:h-32 sm:w-24",
        COVER_COLORS[skuId % COVER_COLORS.length],
      )}
    />
  );
}
