"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { getActivePopup } from "./api";
import { markPopupSeen, safePopupLink, shouldShowPopup } from "./popup";
import type { PopupStores } from "./popup";
import type { Popup } from "./schemas";

const CTA_LABEL = "Xem chi tiết";
const CLOSE_LABEL = "Đóng quảng cáo";

function browserStores(): PopupStores {
  const pick = (name: "sessionStorage" | "localStorage") => {
    try {
      return window[name];
    } catch {
      // Trình duyệt chặn storage (chế độ riêng tư, cookie bị tắt): popup hiện như `every_visit`.
      return null;
    }
  };
  return { session: pick("sessionStorage"), local: pick("localStorage") };
}

/**
 * Popup quảng cáo đang chạy (docs/features/popup.md). Gọi API sau khi trang đã hiện để không chặn render; chỉ mở
 * khi ảnh đã tải xong để không hiện khung trống, và ghi dấu đã xem theo `displayFrequency` lúc mở.
 */
export function PromoPopup() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [popup, setPopup] = useState<Popup | null>(null);

  useEffect(() => {
    let cancelled = false;
    getActivePopup()
      .then((active) => {
        if (!cancelled && active && shouldShowPopup(active, browserStores(), new Date())) {
          setPopup(active);
        }
      })
      .catch((error: unknown) => {
        // Popup không quan trọng bằng nội dung trang: lỗi thì bỏ qua, không làm phiền khách.
        console.warn("Không tải được popup quảng cáo", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!popup) {
    return null;
  }

  const link = safePopupLink(popup.linkUrl);
  const close = () => dialog.current?.close();
  const open = () => {
    if (dialog.current && !dialog.current.open) {
      dialog.current.showModal();
      markPopupSeen(popup, browserStores(), new Date());
    }
  };
  const linkProps = link?.external ? { target: "_blank", rel: "noopener noreferrer" } : {};

  const image = (
    <Image
      src={popup.imageUrl}
      alt={popup.title}
      width={800}
      height={1000}
      // Ảnh nằm trong dialog đang đóng nên phải tải ngay (lazy sẽ không tải); chưa khai báo `remotePatterns`.
      loading="eager"
      unoptimized
      onLoad={open}
      className="block h-auto max-h-[72dvh] w-full object-contain"
    />
  );

  return (
    <dialog
      ref={dialog}
      aria-label={popup.title}
      className="bg-panel text-ivory border-gold/40 backdrop:bg-ink/80 fixed inset-0 m-auto w-[min(calc(100%-2rem),30rem)] overflow-visible border p-0 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.95)]"
    >
      <button
        type="button"
        aria-label={CLOSE_LABEL}
        onClick={close}
        className="bg-ink text-ivory border-gold/50 hover:text-gold absolute -top-4 -right-4 z-10 flex size-11 items-center justify-center rounded-full border"
      >
        <X size={20} aria-hidden="true" />
      </button>
      {link ? (
        <>
          <Link href={link.href} onClick={close} tabIndex={-1} aria-hidden="true" {...linkProps}>
            {image}
          </Link>
          <div className="p-4">
            <Link
              href={link.href}
              onClick={close}
              {...linkProps}
              className="btn-sweep bg-gold text-ink flex min-h-12 items-center justify-center gap-2.5 font-semibold"
            >
              {CTA_LABEL}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </>
      ) : (
        image
      )}
    </dialog>
  );
}
