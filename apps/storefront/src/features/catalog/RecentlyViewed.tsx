"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { bookPath } from "./book-detail";
import { BookCover } from "./BookCover";
import {
  addRecentlyViewed,
  parseRecentlyViewed,
  readRecentlyViewed,
  readRecentlyViewedRaw,
  writeRecentlyViewed,
} from "./recently-viewed";
import type { RecentBook } from "./recently-viewed";

export interface RecentlyViewedProps {
  /** Cuốn đang xem (trang chi tiết): ghi vào danh sách và không hiện lại trong mục. */
  current?: RecentBook;
  className?: string;
}

function localStore(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    // Trình duyệt chặn storage (chặn dữ liệu trang web, chế độ riêng tư): mục này tự ẩn.
    return null;
  }
}

// Sự kiện `storage` chỉ bắn khi tab khác ghi; tab hiện tại không cần vì cuốn vừa ghi là cuốn đang xem (không hiện).
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
const getSnapshot = () => readRecentlyViewedRaw(localStore());
const getServerSnapshot = () => "";

/**
 * Sách khách đã xem gần đây trên thiết bị này (localStorage, không cần đăng nhập). Chỉ hiện bìa và tên, bấm để mở trang
 * chi tiết với giá mới nhất. HTML từ server không có mục này (chưa đọc được storage) nên nó chỉ xuất hiện sau khi tải.
 */
export function RecentlyViewed({ current, className }: RecentlyViewedProps) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const currentId = current?.id;
  const books = useMemo(() => parseRecentlyViewed(raw).filter((book) => book.id !== currentId), [raw, currentId]);

  const { slug = "", title = "", coverImageUrl = null } = current ?? {};
  useEffect(() => {
    if (currentId === undefined) return;
    const store = localStore();
    writeRecentlyViewed(
      store,
      addRecentlyViewed(readRecentlyViewed(store), { id: currentId, slug, title, coverImageUrl }),
    );
  }, [currentId, slug, title, coverImageUrl]);

  if (!books.length) return null;
  return (
    <section aria-labelledby="da-xem-gan-day" className={className}>
      <h2 id="da-xem-gan-day" className="font-editorial text-[28px] font-bold">
        Sách bạn đã xem gần đây
      </h2>
      <ul className="-mx-4 mt-5 flex [scrollbar-width:none] gap-5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        {books.map((book) => (
          <li key={book.id} className="w-28 shrink-0">
            <Link href={bookPath(book.slug)} className="group flex flex-col gap-2.5">
              <BookCover book={book} size="mini" className="transition-transform group-hover:-translate-y-1" />
              <span className="group-hover:text-gold line-clamp-2 text-sm leading-snug transition-colors">
                {book.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
