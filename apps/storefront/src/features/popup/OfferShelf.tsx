"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { Container } from "@slvn/ui";
import { safePopupLink } from "./popup";
import type { Popup } from "./schemas";

const CLOSE_LABEL = "Đóng quảng cáo";

/**
 * Khu "Ưu đãi đang chạy" ở trang chủ: khách lỡ tắt popup lúc mới vào web thì bấm vào thẻ để xem lại đầy đủ. Không áp
 * tần suất hiển thị và không ghi dấu "đã xem" của popup tự bật. Không có popup nào thì không hiện gì.
 */
export function OfferShelf({ popups }: { popups: Popup[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Popup | null>(null);

  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
    }
  }, [selected]);

  if (popups.length === 0) {
    return null;
  }

  const link = selected ? safePopupLink(selected.linkUrl) : null;
  return (
    <section aria-labelledby="running-offers" className="bg-ink-deep border-gold/25 border-y">
      <Container className="flex flex-col gap-8 py-14 sm:gap-12 sm:py-20">
        <div className="flex flex-col gap-4">
          <p className="text-gold flex items-center gap-3.5 text-xs tracking-[0.3em]">
            <span className="bg-gold h-px w-10" />
            ƯU ĐÃI ĐANG CHẠY
          </p>
          <h2 id="running-offers" className="font-editorial text-[34px] leading-[1.05] font-bold sm:text-[44px]">
            Chương trình <span className="text-gold font-medium italic">đang diễn ra</span>
          </h2>
        </div>

        {/* Điện thoại: vuốt ngang, lộ một phần thẻ kế tiếp; desktop: lưới 3 cột (backend trả tối đa 3 popup). */}
        <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-7 lg:overflow-visible lg:px-0">
          {popups.map((popup) => (
            <li key={popup.id} className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-auto">
              <button
                type="button"
                onClick={() => setSelected(popup)}
                className="group bg-panel border-gold/30 hover:border-gold flex h-full w-full cursor-pointer flex-col border text-left transition-colors"
              >
                <span className="bg-ink-deep border-gold/20 relative block aspect-[16/10] overflow-hidden border-b">
                  <Image
                    src={popup.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 380px, 78vw"
                    unoptimized
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </span>
                {/* Các thẻ trong hàng cao bằng nhau; chữ "Xem lại nội dung" luôn nằm sát đáy dù tiêu đề dài ngắn khác nhau. */}
                <span className="flex flex-1 flex-col gap-4 px-5 pt-5 pb-5.5">
                  <span className="font-editorial text-xl leading-snug font-bold">{popup.title}</span>
                  <span className="text-gold-pale mt-auto flex items-center gap-2 text-sm font-medium">
                    Xem lại nội dung
                    <ArrowRight size={16} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Container>

      <dialog
        ref={dialog}
        aria-label={selected?.title}
        onClose={() => setSelected(null)}
        className="modal bg-panel text-ivory border-gold/40 backdrop:bg-ink/80 fixed inset-0 m-auto w-fit max-w-none border p-0 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.95)]"
      >
        {selected && (
          <>
            <button
              type="button"
              aria-label={CLOSE_LABEL}
              onClick={() => dialog.current?.close()}
              className="bg-ink/90 text-ivory border-gold/50 hover:text-gold absolute top-2 right-2 z-10 flex size-11 items-center justify-center rounded-full border"
            >
              <X size={20} aria-hidden="true" />
            </button>
            <Image
              src={selected.imageUrl}
              alt={selected.title}
              width={800}
              height={1000}
              unoptimized
              className="block h-auto max-h-[75dvh] w-auto max-w-[calc(100vw-2rem)] object-contain lg:max-w-[min(calc(100vw-4rem),64rem)] lg:min-w-[36rem]"
            />
            {/* `w-0 min-w-full`: thanh này không góp vào bề rộng của hộp thoại (do ảnh quyết định) nên tiêu đề dài tự xuống dòng. */}
            <div className="border-gold/25 flex w-0 min-w-full flex-col gap-4 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-editorial min-w-0 text-lg leading-snug font-bold [overflow-wrap:anywhere]">
                {selected.title}
              </span>
              {link && (
                <Link
                  href={link.href}
                  onClick={() => dialog.current?.close()}
                  {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="btn-sweep bg-gold text-ink flex h-12 shrink-0 items-center justify-center gap-2.5 px-6 font-semibold"
                >
                  Xem chương trình
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              )}
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
