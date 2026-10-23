import Image from "next/image";
import { Scale } from "lucide-react";

export interface Book3DProps {
  title: string;
  coverImageUrl: string | null;
}

/** Cuốn sách 3D (bìa, gáy, mép giấy) cho hero; nghiêng theo biến CSS của HeroSpotlight. */
export function Book3D({ title, coverImageUrl }: Book3DProps) {
  return (
    <div className="book-stage">
      <div role="img" aria-label={`Bìa sách ${title}`} className="book-3d h-77.5 w-55 sm:h-102.5 sm:w-72.5">
        <div className="book-front bg-cover-navy flex p-4 shadow-[inset_10px_0_18px_-10px_rgb(0_0_0/0.6)] sm:p-5.5">
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
        </div>
        <div className="book-back bg-cover-navy" />
        <div className="book-spine bg-cover-spine flex items-center justify-center shadow-[inset_-8px_0_14px_-6px_rgb(0_0_0/0.6)]">
          <span className="font-editorial text-gold line-clamp-1 rotate-180 text-sm font-bold tracking-[0.18em] uppercase [writing-mode:vertical-rl]">
            {title}
          </span>
        </div>
        <div className="book-edge" />
        <div className="book-top" />
      </div>
    </div>
  );
}
