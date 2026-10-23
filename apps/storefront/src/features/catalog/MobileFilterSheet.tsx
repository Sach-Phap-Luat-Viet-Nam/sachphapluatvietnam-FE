"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";

export interface MobileFilterSheetProps {
  activeCount: number;
  /** Bộ lọc render sẵn trên server (`CatalogFilters`). */
  children: ReactNode;
}

/** Nút "Bộ lọc (n)" và bảng trượt từ dưới lên trên điện thoại; desktop dùng sidebar. */
export function MobileFilterSheet({ activeCount, children }: MobileFilterSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="border-gold text-gold flex min-h-11 items-center justify-center gap-2 border px-4 text-[15px] font-medium lg:hidden"
      >
        <SlidersHorizontal size={18} />
        Bộ lọc{activeCount ? ` (${activeCount})` : ""}
      </button>
      <dialog
        ref={dialog}
        aria-label="Bộ lọc"
        className="sheet bg-panel text-ivory border-gold fixed inset-x-0 top-auto bottom-0 m-0 max-h-[88dvh] w-full max-w-none overflow-auto border-t px-4 pt-3 pb-8 lg:hidden"
      >
        <span aria-hidden="true" className="bg-ivory/30 mx-auto mb-3 block h-1 w-10 rounded-full" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-editorial text-2xl font-bold">Bộ lọc</h2>
          <button
            type="button"
            aria-label="Đóng bộ lọc"
            onClick={() => dialog.current?.close()}
            className="flex size-11 items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </dialog>
    </>
  );
}
