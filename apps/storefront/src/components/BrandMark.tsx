import Link from "next/link";
import { Scale } from "lucide-react";

/** Logo chữ "Sách Luật / VIỆT NAM" cạnh con dấu cán cân, dẫn về trang chủ. */
export function BrandMark() {
  return (
    <Link href="/" aria-label="Sách Luật Việt Nam — Trang chủ" className="group flex shrink-0 items-center gap-3.5">
      <span className="bg-gold text-ink relative flex size-12 items-center justify-center shadow-[0_10px_24px_-12px_rgb(203_166_94/0.7)]">
        <span aria-hidden="true" className="border-ink/45 absolute inset-1 border" />
        <Scale size={24} strokeWidth={1.5} className="transition-transform duration-500 group-hover:-rotate-8" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-editorial text-[23px] font-bold sm:text-[26px]">Sách Luật</span>
        <span className="text-gold mt-1.5 text-[10px] tracking-[0.42em] sm:text-[11px]">VIỆT NAM</span>
      </span>
    </Link>
  );
}
