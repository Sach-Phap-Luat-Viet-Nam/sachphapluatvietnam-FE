import Link from "next/link";
import { Scale } from "lucide-react";

/** Logo chữ "Sách Luật / VIỆT NAM", dẫn về trang chủ. */
export function BrandMark() {
  return (
    <Link href="/" aria-label="Sách Luật Việt Nam — Trang chủ" className="flex shrink-0 items-center gap-3.5">
      <span className="border-gold text-gold flex size-11 items-center justify-center border">
        <Scale size={24} strokeWidth={1.4} />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-editorial text-[22px] font-bold sm:text-2xl">Sách Luật</span>
        <span className="text-gold mt-1 text-[10px] tracking-[0.32em] sm:text-[11px]">VIỆT NAM</span>
      </span>
    </Link>
  );
}
