"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Container, cn } from "@slvn/ui";
import { animateScrollLeft } from "@/lib/animate-scroll";
import type { ScrollAnimation } from "@/lib/animate-scroll";
import { tourAnchor } from "@/lib/tour-anchor";
import { safePopupLink } from "./popup";
import type { Popup } from "./schemas";

const CLOSE_LABEL = "Đóng quảng cáo";
/** Thời gian giữa hai lần tự chuyển băng-rôn. */
export const AUTO_ADVANCE_MS = 2000;

/**
 * Khu "Chương trình đang diễn ra" ở trang chủ: băng-rôn trượt, khách lỡ tắt popup lúc mới vào web thì bấm vào để xem lại đầy đủ. Không áp
 * tần suất hiển thị và không ghi dấu "đã xem" của popup tự bật. Không có popup nào thì không hiện gì.
 */
export function OfferShelf({ popups }: { popups: Popup[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const [selected, setSelected] = useState<Popup | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = popups.length;
  const animation = useRef<ScrollAnimation | null>(null);

  // Trượt tới băng-rôn `target` bằng animation riêng (0,9 giây, easing mềm) thay cho `scroll-behavior: smooth` của trình
  // duyệt vốn quá nhanh và không chỉnh được. `index` đặt ngay về đích; trong lúc trượt bỏ qua `onScroll` để chấm tròn
  // không nhảy qua lại ở nửa đường.
  const scrollToIndex = useCallback((target: number) => {
    animation.current?.cancel();
    setIndex(target);
    const list = track.current;
    if (!list || list.clientWidth === 0) return;
    animation.current = animateScrollLeft(list, target * list.clientWidth, undefined, () => {
      animation.current = null;
    });
  }, []);
  // Khách chạm, vuốt hoặc lăn chuột thì nhường quyền cuộn cho tay, dừng animation đang chạy.
  const stopAnimation = () => animation.current?.cancel();
  useEffect(() => () => animation.current?.cancel(), []);

  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
    }
  }, [selected]);

  // Tự chuyển sang băng-rôn kế tiếp mỗi 2 giây. Tạm dừng khi rê chuột/focus bàn phím vào khu này hoặc đang mở hộp thoại;
  // `index` nằm trong deps nên bấm nút hay vuốt tay cũng đếm lại 2 giây, không bị nhảy ngay sau thao tác của khách.
  useEffect(() => {
    if (count < 2 || paused || selected) return;
    // `index` luôn theo vị trí cuộn (handleScroll) nên vuốt tay xong vẫn chuyển tiếp từ đúng băng-rôn đang xem.
    const timer = window.setInterval(() => scrollToIndex((index + 1) % count), AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [count, paused, selected, index, scrollToIndex]);

  if (popups.length === 0) {
    return null;
  }

  // Vị trí hiện tại theo vị trí cuộn, để chấm tròn đúng cả khi khách vuốt tay.
  const handleScroll = () => {
    const list = track.current;
    if (animation.current === null && list && list.clientWidth > 0)
      setIndex(Math.round(list.scrollLeft / list.clientWidth));
  };
  // Hết một vòng thì quay lại đầu/cuối.
  const goTo = (target: number) => scrollToIndex((target + popups.length) % popups.length);

  const link = selected ? safePopupLink(selected.linkUrl) : null;
  return (
    <section aria-labelledby="running-offers" {...tourAnchor("offers")} className="bg-ink-deep border-gold/25 border-y">
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

        {/* Băng-rôn trượt: mỗi lần một chương trình (vuốt/cuộn ngang, nút trái-phải, chấm tròn), nên nhiều chương trình
            cũng không làm khu này dài thêm. Banner luôn 1920×1080 nên khung 16:9 hiện đủ ảnh, không cắt; `max-w-3xl` (48rem)
            để khung gọn hơn bề rộng nội dung. */}
        <div
          role="group"
          aria-roledescription="carousel"
          aria-labelledby="running-offers"
          className="relative mx-auto w-full max-w-3xl"
          // Chỉ chuột mới tạm dừng khi rê vào (chạm trên điện thoại thì không); bàn phím thì khi focus nhìn thấy.
          onPointerEnter={(event) => event.pointerType === "mouse" && setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocusCapture={(event) => event.target.matches(":focus-visible") && setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <ul
            ref={track}
            onScroll={handleScroll}
            onPointerDown={stopAnimation}
            onWheel={stopAnimation}
            className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
          >
            {popups.map((popup, position) => (
              <li
                key={popup.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${position + 1} / ${popups.length}`}
                className="w-full shrink-0 snap-center"
              >
                {/* Chuyển động: băng-rôn đang xem sáng và to hết cỡ, băng-rôn bên cạnh mờ và nhỏ hơn chút; phần chữ trượt
                    lên khi băng-rôn vào giữa. Chỉ animate opacity/transform (không gây CLS). */}
                <button
                  type="button"
                  onClick={() => setSelected(popup)}
                  data-active={position === index}
                  className={cn(
                    "group bg-ink-deep border-gold/30 hover:border-gold relative block aspect-video w-full cursor-pointer overflow-hidden border text-left transition-[opacity,transform,border-color] duration-900 ease-[var(--ease-out-soft)]",
                    position === index ? "scale-100 opacity-100" : "scale-[0.94] opacity-40",
                  )}
                >
                  <Image
                    src={popup.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 768px, 100vw"
                    unoptimized
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <span
                    className={cn(
                      "from-ink/90 via-ink/40 absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t to-transparent px-4 pt-10 pb-3 transition-[opacity,transform] delay-200 duration-900 ease-[var(--ease-out-soft)] sm:gap-1.5 sm:px-6 sm:pt-12 sm:pb-4",
                      position === index ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                    )}
                  >
                    {/* Banner đã có chữ nên không in lại tên chương trình; vẫn giữ làm nhãn cho trình đọc màn hình. */}
                    <span className="sr-only">{popup.title}</span>
                    <span className="text-gold-pale flex items-center gap-1.5 text-xs font-medium">
                      Xem lại nội dung
                      <ArrowRight size={14} strokeWidth={1.6} aria-hidden="true" />
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {popups.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Chương trình trước"
                onClick={() => goTo(index - 1)}
                className="bg-ink/70 text-ivory border-gold/50 hover:text-gold absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border sm:left-5"
              >
                <ChevronLeft size={22} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Chương trình sau"
                onClick={() => goTo(index + 1)}
                className="bg-ink/70 text-ivory border-gold/50 hover:text-gold absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border sm:right-5"
              >
                <ChevronRight size={22} aria-hidden="true" />
              </button>
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-0.5 sm:bottom-4">
                {popups.map((popup, position) => (
                  <button
                    key={popup.id}
                    type="button"
                    aria-label={`Chuyển tới chương trình ${position + 1}`}
                    aria-current={position === index}
                    onClick={() => goTo(position)}
                    className="flex h-6 items-center justify-center px-1"
                  >
                    <span
                      className={cn(
                        "block h-1.5 rounded-full transition-all",
                        position === index ? "bg-ivory w-6" : "bg-ivory/50 w-1.5",
                      )}
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </Container>

      <dialog
        ref={dialog}
        aria-label={selected?.title}
        onClose={() => setSelected(null)}
        className="modal bg-panel text-ivory border-gold/40 backdrop:bg-scrim/75 fixed inset-0 m-auto w-fit max-w-none border p-0 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.95)]"
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
