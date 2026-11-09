import { describe, expect, it } from "vitest";
import { stepScrollTarget } from "./tour-scroll";

const viewport = { height: 800, scrollY: 1000, maxScrollY: 5000 };

describe("stepScrollTarget", () => {
  it("không cuộn khi mốc đã nằm trọn trong màn hình", () => {
    expect(stepScrollTarget({ top: 0, bottom: 800 }, viewport)).toBeNull();
    expect(stepScrollTarget({ top: 300, bottom: 400 }, viewport)).toBeNull();
  });

  it("cuộn xuống để mốc ở dưới màn hình nằm giữa", () => {
    // Mốc cao 100px ở 2000px dưới mép trên: tâm mốc về giữa màn hình (400px).
    expect(stepScrollTarget({ top: 2000, bottom: 2100 }, viewport)).toBe(1000 + 2050 - 400);
  });

  it("cuộn lên để mốc ở trên màn hình nằm giữa, không cuộn quá đầu trang", () => {
    expect(stepScrollTarget({ top: -500, bottom: -400 }, viewport)).toBe(1000 - 450 - 400);
    expect(stepScrollTarget({ top: -1000, bottom: -950 }, viewport)).toBe(0);
  });

  it("không cuộn quá đáy trang", () => {
    expect(stepScrollTarget({ top: 4700, bottom: 4750 }, viewport)).toBe(5000);
  });

  it("mốc cao hơn màn hình thì đưa mép trên lên đầu như driver.js", () => {
    expect(stepScrollTarget({ top: 900, bottom: 1900 }, viewport)).toBe(1900);
  });

  it("mốc bị khuất một phần cũng cuộn", () => {
    expect(stepScrollTarget({ top: 750, bottom: 850 }, viewport)).toBe(1000 + 800 - 400);
  });
});
