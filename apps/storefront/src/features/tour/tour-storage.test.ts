import { describe, expect, it } from "vitest";
import { TOUR_STORAGE_KEY, markTourDone, shouldStartTour } from "./tour-storage";

function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

const blocked = {
  getItem: (): string | null => {
    throw new DOMException("blocked", "SecurityError");
  },
  setItem: () => {
    throw new DOMException("blocked", "SecurityError");
  },
};

describe("shouldStartTour", () => {
  it("starts on a device that has not seen the tour", () => {
    expect(shouldStartTour(memoryStore())).toBe(true);
  });

  it("does not start again once marked done", () => {
    const store = memoryStore();
    markTourDone(store);
    expect(store.getItem(TOUR_STORAGE_KEY)).toBe("1");
    expect(shouldStartTour(store)).toBe(false);
  });

  it("does not start when storage is unavailable or blocked", () => {
    expect(shouldStartTour(null)).toBe(false);
    expect(shouldStartTour(blocked)).toBe(false);
  });
});

describe("markTourDone", () => {
  it("ignores blocked storage", () => {
    expect(() => markTourDone(blocked)).not.toThrow();
    expect(() => markTourDone(null)).not.toThrow();
  });
});
