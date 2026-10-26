import Image from "next/image";
import { cn } from "@slvn/ui";
import type { ComboItem } from "./schemas";

const COVER_COLORS = ["bg-cover-navy", "bg-cover-wine", "bg-cover-green", "bg-cover-umber", "bg-cover-plum"];

/** Số bìa tối đa hiện ở phần ảnh của combo; bộ nhiều sách hơn thì liệt kê đủ ở danh sách bên cạnh. */
const MAX_COVERS = 4;

/** Số cột theo số bìa: thẻ xếp một hàng, trang combo xếp 2 cột khi từ 4 bìa để mỗi bìa đủ lớn. */
const CARD_COLUMNS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };
const HERO_COLUMNS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2" };

export interface ComboCoverProps {
  item: Pick<ComboItem, "skuId" | "bookTitle" | "coverImageUrl">;
  className?: string;
}

/** Bìa một cuốn, tỷ lệ 3:4 (cùng cách hiện với `BookCover`: ảnh mockup trên nền ngà, không có ảnh thì vẽ bìa thay thế). */
export function ComboCover({ item, className }: ComboCoverProps) {
  if (item.coverImageUrl) {
    return (
      <span
        className={cn(
          "bg-cream relative block aspect-[3/4] overflow-hidden shadow-[0_14px_24px_-14px_rgb(0_0_0/0.85)]",
          className,
        )}
      >
        <Image
          src={item.coverImageUrl}
          alt={`Bìa sách ${item.bookTitle}`}
          fill
          sizes="(min-width: 1024px) 240px, 40vw"
          // Chưa chốt CDN ảnh bìa nên chưa khai báo `images.remotePatterns`; bỏ tối ưu để nhận mọi URL backend trả.
          unoptimized
          className="object-cover mix-blend-multiply"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex aspect-[3/4] border-l-[6px] border-black/30 p-1.5 sm:p-2",
        COVER_COLORS[item.skuId % COVER_COLORS.length],
        className,
      )}
    >
      <span className="border-gold/60 text-cover-foil font-editorial flex flex-1 items-center justify-center border px-1 text-center text-[11px] leading-tight font-bold uppercase sm:text-xs">
        <span className="line-clamp-4">{item.bookTitle}</span>
      </span>
    </span>
  );
}

export interface ComboCoversProps {
  items: readonly ComboItem[];
  /** `card`: thẻ trong danh sách; `hero`: ảnh lớn ở trang combo. */
  size?: "card" | "hero";
}

/** Các bìa trong bộ xếp cạnh nhau (tối đa 4). Mô tả đầy đủ bộ sách nằm ở danh sách bên cạnh nên khối này chỉ để trang trí. */
export function ComboCovers({ items, size = "card" }: ComboCoversProps) {
  const shown = items.slice(0, MAX_COVERS);
  const columns = (size === "hero" ? HERO_COLUMNS : CARD_COLUMNS)[shown.length] ?? "grid-cols-2";
  return (
    <ul
      className={cn(
        "mx-auto grid w-full items-end gap-2.5 sm:gap-3",
        columns,
        size === "hero" ? "max-w-md gap-4 sm:gap-5" : "max-w-72",
      )}
    >
      {shown.map((item) => (
        <li key={item.skuId}>
          <ComboCover item={item} />
        </li>
      ))}
    </ul>
  );
}
