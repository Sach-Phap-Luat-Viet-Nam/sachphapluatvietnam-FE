import { vnDateKey } from "@slvn/utils";
import type { Popup } from "./schemas";

type SeenStore = Pick<Storage, "getItem" | "setItem">;

/** Nơi lưu dấu "đã xem"; `null` khi trình duyệt chặn storage. */
export interface PopupStores {
  session: SeenStore | null;
  local: SeenStore | null;
}

/** Khóa có `updatedAt` để popup vừa được sửa trên Admin hiện lại cho người đã xem bản cũ. */
export function popupSeenKey(popup: Pick<Popup, "id" | "updatedAt">): string {
  return `popup:${popup.id}:${popup.updatedAt}`;
}

function read(store: SeenStore | null, key: string): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    // Storage bị chặn: coi như chưa xem, popup hiện như `every_visit`.
    return null;
  }
}

function write(store: SeenStore | null, key: string, value: string): void {
  try {
    store?.setItem(key, value);
  } catch {
    // Storage đầy hoặc bị chặn: chỉ mất tính năng nhớ đã xem.
  }
}

/** Popup có được hiện ở lần tải trang này không, theo `displayFrequency`. */
export function shouldShowPopup(popup: Popup, stores: PopupStores, now: Date): boolean {
  const key = popupSeenKey(popup);
  switch (popup.displayFrequency) {
    case "every_visit":
      return true;
    case "once_per_session":
      return true;
    case "once_per_day":
      return read(stores.local, key) !== vnDateKey(now);
  }
}

/** Ghi dấu đã xem ngay khi popup hiện, để tải lại trang không hiện lại. */
export function markPopupSeen(popup: Popup, stores: PopupStores, now: Date): void {
  const key = popupSeenKey(popup);
  if (popup.displayFrequency === "once_per_session") {
    write(stores.session, key, "1");
  } else if (popup.displayFrequency === "once_per_day") {
    write(stores.local, key, vnDateKey(now));
  }
}

export type PopupLink = { href: string; external: boolean };

/**
 * Link của popup gán thẳng vào `href` nên kiểm tra lại dù backend đã chặn: chỉ nhận path trong site hoặc URL
 * `http`/`https`; bỏ `javascript:`, `data:`, `//host`, `/\host`.
 */
export function safePopupLink(url: string | null): PopupLink | null {
  const value = url?.trim();
  if (!value) {
    return null;
  }
  if (value.startsWith("/")) {
    if (value.startsWith("//") || value.startsWith("/\\")) {
      return null;
    }
    const parsed = new URL(value, "http://localhost");
    return parsed.origin === "http://localhost"
      ? { href: parsed.pathname + parsed.search + parsed.hash, external: false }
      : null;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? { href: parsed.href, external: true } : null;
  } catch {
    // Không phải URL tuyệt đối hợp lệ.
    return null;
  }
}
