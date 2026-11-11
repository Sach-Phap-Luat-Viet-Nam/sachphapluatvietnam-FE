import { describe, expect, it } from "vitest";
import {
  MAX_RECENTLY_VIEWED,
  RECENTLY_VIEWED_KEY,
  addRecentlyViewed,
  readRecentlyViewed,
  writeRecentlyViewed,
} from "./recently-viewed";
import type { RecentBook } from "./recently-viewed";

const book = (id: number): RecentBook => ({ id, slug: `sach-${id}`, title: `Sách ${id}`, coverImageUrl: null });

function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe("recently viewed books", () => {
  it("moves the viewed book to the front without duplicates and caps the list", () => {
    let list: RecentBook[] = [];
    for (let id = 1; id <= MAX_RECENTLY_VIEWED + 2; id++) list = addRecentlyViewed(list, book(id));
    list = addRecentlyViewed(list, book(5));

    expect(list).toHaveLength(MAX_RECENTLY_VIEWED);
    expect(list.map((item) => item.id).slice(0, 3)).toEqual([5, MAX_RECENTLY_VIEWED + 2, MAX_RECENTLY_VIEWED + 1]);
    expect(list.filter((item) => item.id === 5)).toHaveLength(1);
  });

  it("round-trips through storage", () => {
    const store = memoryStore();
    writeRecentlyViewed(store, [book(1), book(2)]);
    expect(readRecentlyViewed(store)).toEqual([book(1), book(2)]);
  });

  it("treats broken data or blocked storage as an empty list", () => {
    expect(readRecentlyViewed(memoryStore({ [RECENTLY_VIEWED_KEY]: "{oops" }))).toEqual([]);
    expect(readRecentlyViewed(memoryStore({ [RECENTLY_VIEWED_KEY]: '[{"id":"x"}]' }))).toEqual([]);
    expect(readRecentlyViewed(null)).toEqual([]);
    const throwing = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(readRecentlyViewed(throwing)).toEqual([]);
    expect(() => writeRecentlyViewed(throwing, [book(1)])).not.toThrow();
  });
});
