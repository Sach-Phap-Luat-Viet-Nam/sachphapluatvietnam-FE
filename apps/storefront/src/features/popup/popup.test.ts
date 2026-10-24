import { markPopupSeen, popupSeenKey, safePopupLink, shouldShowPopup } from "./popup";
import type { PopupStores } from "./popup";
import type { Popup } from "./schemas";

function popup(displayFrequency: Popup["displayFrequency"], updatedAt = "2026-11-01T02:00:00Z"): Popup {
  return { id: 5, title: "Sale mùa thi", imageUrl: "https://img.test/a.jpg", linkUrl: null, displayFrequency, updatedAt };
}

function memoryStore(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

function stores(): PopupStores {
  return { session: memoryStore(), local: memoryStore() };
}

// 10:00 sáng ngày 01/11/2026 giờ Việt Nam.
const NOW = new Date("2026-11-01T03:00:00Z");

describe("shouldShowPopup", () => {
  it("every_visit: luôn hiện", () => {
    const s = stores();
    markPopupSeen(popup("every_visit"), s, NOW);
    expect(shouldShowPopup(popup("every_visit"), s, NOW)).toBe(true);
  });

  it("once_per_session: hiện một lần mỗi phiên", () => {
    const s = stores();
    expect(shouldShowPopup(popup("once_per_session"), s, NOW)).toBe(true);
    markPopupSeen(popup("once_per_session"), s, NOW);
    expect(shouldShowPopup(popup("once_per_session"), s, NOW)).toBe(false);
    expect(shouldShowPopup(popup("once_per_session"), { ...s, session: memoryStore() }, NOW)).toBe(true);
  });

  it("once_per_day: hiện lại sang ngày mới theo giờ Việt Nam", () => {
    const s = stores();
    markPopupSeen(popup("once_per_day"), s, NOW);
    // 23:59 cùng ngày giờ Việt Nam.
    expect(shouldShowPopup(popup("once_per_day"), s, new Date("2026-11-01T16:59:00Z"))).toBe(false);
    // 00:01 ngày hôm sau giờ Việt Nam (vẫn là ngày 01/11 theo UTC).
    expect(shouldShowPopup(popup("once_per_day"), s, new Date("2026-11-01T17:01:00Z"))).toBe(true);
  });

  it("hiện lại khi popup được sửa (updatedAt đổi)", () => {
    const s = stores();
    markPopupSeen(popup("once_per_day"), s, NOW);
    expect(shouldShowPopup(popup("once_per_day", "2026-11-01T02:30:00Z"), s, NOW)).toBe(true);
  });

  it("vẫn hiện khi trình duyệt chặn storage", () => {
    const blocked: Storage = {
      ...memoryStore(),
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    };
    expect(() => markPopupSeen(popup("once_per_day"), { session: blocked, local: blocked }, NOW)).not.toThrow();
    expect(shouldShowPopup(popup("once_per_day"), { session: blocked, local: blocked }, NOW)).toBe(true);
    expect(shouldShowPopup(popup("once_per_session"), { session: null, local: null }, NOW)).toBe(true);
  });
});

describe("popupSeenKey", () => {
  it("gồm id và updatedAt", () => {
    expect(popupSeenKey({ id: 5, updatedAt: "2026-11-01T02:00:00Z" })).toBe("popup:5:2026-11-01T02:00:00Z");
  });
});

describe("safePopupLink", () => {
  it("nhận path trong site", () => {
    expect(safePopupLink("/khuyen-mai?ma=thi#top")).toEqual({ href: "/khuyen-mai?ma=thi#top", external: false });
  });

  it("nhận URL http/https, đánh dấu là link ngoài", () => {
    expect(safePopupLink("https://zalo.me/sachluat")).toEqual({ href: "https://zalo.me/sachluat", external: true });
  });

  it.each([null, "", "  ", "javascript:alert(1)", "data:text/html,x", "//evil.com", "/\\evil.com", "khuyen-mai"])(
    "bỏ link không an toàn %j",
    (url) => {
      expect(safePopupLink(url)).toBeNull();
    },
  );
});
