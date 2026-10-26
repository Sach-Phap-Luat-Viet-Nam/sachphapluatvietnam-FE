import Image from "next/image";
import { Scale } from "lucide-react";

/** Kích thước bìa (tỷ lệ ~1:√2 của sách) và độ dày gáy theo nơi đặt. */
const BOOK_SIZES = {
  hero: "h-77.5 w-55 [--book-depth:40px] sm:h-102.5 sm:w-72.5 sm:[--book-depth:56px]",
  detail: "h-92 w-65 [--book-depth:48px] sm:h-118 sm:w-83 sm:[--book-depth:64px]",
  // Hai cuốn đứng cạnh nhau trong cột 440px của trang combo.
  combo: "h-56 w-40 [--book-depth:30px] sm:h-73 sm:w-52 sm:[--book-depth:40px] lg:h-62 lg:w-44 lg:[--book-depth:34px]",
} as const;

export interface Book3DProps {
  title: string;
  coverImageUrl: string | null;
  size?: keyof typeof BOOK_SIZES;
}

/** Cuốn sách 3D (bìa, gáy, mép giấy, bìa sau); nghiêng theo biến CSS của HeroSpotlight bao ngoài. */
export function Book3D({ title, coverImageUrl, size = "hero" }: Book3DProps) {
  return (
    <div className="book-reveal perspective-[1500px]">
      <div className="book-stage">
        <div role="img" aria-label={`Bìa sách ${title}`} className={`book-3d ${BOOK_SIZES[size]}`}>
          <div className="book-front bg-cover-navy flex p-4 sm:p-5.5">
            {coverImageUrl ? (
              <Image
                src={coverImageUrl}
                alt=""
                fill
                sizes="290px"
                // Chưa chốt CDN ảnh bìa (xem BookCover).
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="border-gold/75 outline-gold/35 text-gold flex flex-1 flex-col items-center border px-4 py-6 text-center outline outline-offset-[5px] sm:py-7">
                <span className="text-[8px] tracking-[0.34em] sm:text-[9px]">SÁCH LUẬT VIỆT NAM</span>
                <Scale size={34} strokeWidth={1} className="my-6 sm:my-8" />
                <span className="foil-text font-editorial text-2xl leading-tight font-extrabold tracking-wide uppercase sm:text-3xl">
                  {title}
                </span>
                <span className="mt-auto h-px w-10 bg-current" />
              </div>
            )}
            <span aria-hidden="true" className="book-gloss absolute inset-0" />
          </div>
          <div className="book-back bg-cover-spine" />
          <div className="book-spine bg-cover-spine flex items-center justify-center overflow-hidden">
            {coverImageUrl && (
              // Gáy lấy màu từ chính ảnh bìa: phóng to, làm mờ rồi phủ tối để chữ vàng đọc được.
              <Image
                src={coverImageUrl}
                alt=""
                fill
                sizes="56px"
                unoptimized
                className="scale-150 object-cover blur-md brightness-60"
              />
            )}
            <span aria-hidden="true" className="book-spine-shade absolute inset-0" />
            <span aria-hidden="true" className="border-gold/70 absolute inset-x-1.5 top-5 h-1.5 border-y" />
            <span aria-hidden="true" className="border-gold/70 absolute inset-x-1.5 bottom-5 h-1.5 border-y" />
            <span className="font-editorial text-gold-pale relative line-clamp-1 max-h-[75%] rotate-180 text-xs font-bold tracking-[0.18em] uppercase [writing-mode:vertical-rl] sm:text-sm">
              {title}
            </span>
          </div>
          <div className="book-edge" />
          <div className="book-top" />
        </div>
      </div>
    </div>
  );
}
