"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { getActivePopup } from "./api";
import { markPopupSeen, safePopupLink, shouldShowPopup } from "./popup";
import type { PopupStores } from "./popup";
import type { Popup } from "./schemas";

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
      // Hiện theo kích thước thật của ảnh, giới hạn trong màn hình; PC rộng tối thiểu 36rem để ảnh nhỏ không bị bé.
      className="block h-auto max-h-[85dvh] w-auto max-w-[calc(100vw-2rem)] object-contain lg:max-w-[min(calc(100vw-4rem),64rem)] lg:min-w-[36rem]"
    />
  );

  return (
    <dialog
      ref={dialog}
      aria-label={popup.title}
      className="modal bg-panel text-ivory border-gold/40 backdrop:bg-ink/80 fixed inset-0 m-auto w-fit max-w-none border p-0 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.95)]"
    >
      <button
        type="button"
        aria-label={CLOSE_LABEL}
        onClick={close}
        className="bg-ink/90 text-ivory border-gold/50 hover:text-gold absolute top-2 right-2 z-10 flex size-11 items-center justify-center rounded-full border"
      >
        <X size={20} aria-hidden="true" />
      </button>
      {link ? (
        // Bấm vào ảnh là mở link; tên link lấy từ alt của ảnh (`title` của popup).
        <Link
          href={link.href}
          onClick={close}
          {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="block"
        >
          {image}
        </Link>
      ) : (
        image
      )}
    </dialog>
  );
}
