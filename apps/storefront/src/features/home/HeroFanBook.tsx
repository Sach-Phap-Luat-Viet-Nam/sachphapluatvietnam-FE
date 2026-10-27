import Image from "next/image";
import Link from "next/link";
import { cn } from "@slvn/ui";

// Hai lớp bóng: bóng đổ xuống sàn rộng và đậm, cộng bóng sát mép để cuốn sách tách khỏi nền tối.
const FRAME = "absolute hidden border-l-12 border-black/30 [box-shadow:var(--book-fan-shadow)] sm:block";

export interface HeroFanBookProps {
  /** Sách mới thứ 2, 3; không có thì vẽ bìa màu trơn như trang trí. */
  book: { title: string; slug: string; coverImageUrl: string | null } | undefined;
  /** Vị trí, kích thước, màu nền và hiệu ứng xòe (`book-fan-left`/`book-fan-right`). */
  className: string;
}

/** Cuốn sách xòe sau cuốn chính ở hero: bìa thật của sách mới, bấm vào mở trang chi tiết. */
export function HeroFanBook({ book, className }: HeroFanBookProps) {
  if (!book) {
    return <span aria-hidden="true" className={cn(FRAME, className)} />;
  }

  return (
    <Link
      href={`/sach/${book.slug}`}
      aria-label={`Sách mới: ${book.title}`}
      className={cn(FRAME, "group overflow-hidden", className)}
    >
      {book.coverImageUrl ? (
        <Image
          src={book.coverImageUrl}
          alt=""
          fill
          sizes="240px"
          // Chưa chốt CDN ảnh bìa (xem BookCover).
          unoptimized
          className="object-cover transition-[filter] duration-500 group-hover:brightness-110"
        />
      ) : (
        <span className="border-gold/50 text-cover-foil font-editorial absolute inset-3 flex items-center justify-center border px-3 text-center text-lg leading-tight font-bold uppercase">
          {book.title}
        </span>
      )}
      {/* Bóng cong gần gáy và mép dưới cho bìa có độ dày. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,var(--book-hinge),transparent_14%),linear-gradient(0deg,var(--book-hinge),transparent_22%)]"
      />
      {/* Phủ tối nhẹ để cuốn chính ở giữa vẫn nổi bật. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-(--book-fan-dim) transition-opacity duration-500 group-hover:opacity-0"
      />
    </Link>
  );
}
