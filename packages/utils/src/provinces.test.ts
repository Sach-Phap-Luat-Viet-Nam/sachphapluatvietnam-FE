import { describe, expect, it } from "vitest";
import { PROVINCES } from "./provinces";

describe("PROVINCES", () => {
  it("có đủ 34 tỉnh/thành và không trùng", () => {
    expect(PROVINCES).toHaveLength(34);
    expect(new Set(PROVINCES).size).toBe(34);
  });
});
