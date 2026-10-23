import { describe, expect, it } from "vitest";
import { dustMotes, tickerItems } from "./home";

describe("tickerItems", () => {
  it("keeps unique, non-empty update labels in order", () => {
    expect(
      tickerItems([
        { updatedToText: "Cập nhật đến BLDS 91/2015/QH13" },
        { updatedToText: null },
        { updatedToText: "  " },
        { updatedToText: "Cập nhật đến Luật 31/2024/QH15 " },
        { updatedToText: "Cập nhật đến BLDS 91/2015/QH13" },
      ]),
    ).toEqual(["Cập nhật đến BLDS 91/2015/QH13", "Cập nhật đến Luật 31/2024/QH15"]);
  });
});

describe("dustMotes", () => {
  it("is deterministic so server and client render the same markup", () => {
    expect(dustMotes(5)).toEqual(dustMotes(5));
    expect(dustMotes()).toHaveLength(18);
    for (const mote of dustMotes()) {
      expect(mote.left).toBeGreaterThanOrEqual(48);
      expect(mote.left).toBeLessThan(98);
      expect(mote.delay).toBeLessThanOrEqual(0);
    }
  });
});
