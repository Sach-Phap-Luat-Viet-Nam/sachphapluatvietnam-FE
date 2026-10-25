import { describe, expect, it } from "vitest";
import { GUIDE_RATIO, placeGuide } from "./guide-placement";

const DESKTOP = { width: 1280, height: 720 };
const PHONE = { width: 390, height: 844 };
const NOMINAL = 220;

describe("placeGuide", () => {
  it("puts the guide above a box that has room, standing behind its top edge", () => {
    const box = { left: 425, top: 400, right: 855, bottom: 640 };
    const placement = placeGuide(box, DESKTOP, NOMINAL, "right");
    expect(placement?.side).toBe("top");
    expect(placement?.width).toBe(NOMINAL);
    // Phần ảnh nằm trong hộp (khuất sau hộp) là 30% chiều cao.
    const bottom = (placement?.top ?? 0) + NOMINAL * GUIDE_RATIO;
    expect(bottom).toBeGreaterThan(box.top);
    expect(bottom - box.top).toBeCloseTo(NOMINAL * GUIDE_RATIO * 0.3);
  });

  it("moves beside the box when it sits at the top edge (no cut-off head)", () => {
    const box = { left: 0, top: 52, right: 430, bottom: 262 };
    const placement = placeGuide(box, DESKTOP, NOMINAL, "right");
    expect(placement?.side).toBe("right");
    expect(placement?.top).toBeGreaterThanOrEqual(8);
    expect((placement?.left ?? 0) + (placement?.width ?? 0)).toBeLessThanOrEqual(DESKTOP.width);
  });

  it("flips the image so its gesture points into the box", () => {
    const aboveLeft = { left: 425, top: 400, right: 855, bottom: 640 };
    // Cử chỉ gốc hướng phải, nhân vật phía trên/bên trái hộp: không cần lật. Hướng trái: phải lật.
    expect(placeGuide(aboveLeft, DESKTOP, NOMINAL, "right")?.flip).toBe(false);
    expect(placeGuide(aboveLeft, DESKTOP, NOMINAL, "left")?.flip).toBe(true);

    const topEdge = { left: 0, top: 52, right: 430, bottom: 262 };
    // Nhân vật bên phải hộp cần hướng trái: ảnh gốc hướng phải thì phải lật.
    expect(placeGuide(topEdge, DESKTOP, NOMINAL, "right")?.flip).toBe(true);
    expect(placeGuide(topEdge, DESKTOP, NOMINAL, "left")?.flip).toBe(false);
  });

  it("shrinks the guide when space is tight but still usable", () => {
    const box = { left: 16, top: 120, right: 374, bottom: 800 };
    const placement = placeGuide(box, PHONE, 160, "right");
    expect(placement?.side).toBe("top");
    expect(placement?.width).toBeLessThan(160);
    expect(placement?.width).toBeGreaterThanOrEqual(160 * 0.6);
    expect(placement?.top).toBeGreaterThanOrEqual(8);
  });

  it("hides the guide when no side has enough room", () => {
    const box = { left: 16, top: 60, right: 374, bottom: 800 };
    expect(placeGuide(box, PHONE, 160, "right")).toBeNull();
  });

  it("never covers the element being introduced", () => {
    // Hộp ngay dưới thanh ưu đãi, nhân vật phía trên sẽ đè lên thanh: phải chuyển sang bên cạnh.
    const target = { left: 0, top: 0, right: 1280, bottom: 36 };
    const box = { left: 0, top: 52, right: 430, bottom: 262 };
    const placement = placeGuide(box, DESKTOP, NOMINAL, "right", target);
    expect(placement).not.toBeNull();
    const bottom = (placement?.top ?? 0) + NOMINAL * GUIDE_RATIO;
    expect(placement?.top).toBeGreaterThanOrEqual(target.bottom + 12);
    expect(bottom).toBeGreaterThan(0);
  });

  it("stands below the box on a phone when the target blocks the top", () => {
    // Ô tìm kiếm ngay trên hộp: phía trên bị chặn, hai bên không có chỗ, chỉ còn phía dưới.
    const target = { left: 16, top: 250, right: 374, bottom: 310 };
    const box = { left: 16, top: 330, right: 374, bottom: 560 };
    const placement = placeGuide(box, PHONE, 160, "right", target);
    expect(placement?.side).toBe("bottom");
    expect(placement?.top).toBeGreaterThanOrEqual(box.bottom);
    expect((placement?.top ?? 0) + 160 * GUIDE_RATIO).toBeLessThanOrEqual(PHONE.height);
  });

  it("hides the guide when every side would cover the target or leave the screen", () => {
    const target = { left: 16, top: 250, right: 374, bottom: 310 };
    const box = { left: 16, top: 330, right: 374, bottom: 760 };
    expect(placeGuide(box, PHONE, 160, "right", target)).toBeNull();
  });

  it("uses the image's own ratio, so a wide image needs less height than a tall one", () => {
    // Hộp cách mép trên 200px: ảnh ngang rộng 360px (cao 235, chỉ cần 165px phía trên) đứng được phía trên hộp,
    // còn ảnh dọc cùng bề rộng (cao 450, cần 315px) thì không.
    const box = { left: 425, top: 200, right: 855, bottom: 640 };
    const wide = placeGuide(box, DESKTOP, 360, "right", undefined, 0.654);
    expect(wide?.side).toBe("top");
    expect(wide?.width).toBe(360);
    const tall = placeGuide(box, DESKTOP, 360, "right");
    expect(tall?.side).not.toBe("top");
  });

  it("never lets the guide leave the viewport", () => {
    const boxes = [
      { left: 0, top: 52, right: 430, bottom: 262 },
      { left: 850, top: 300, right: 1280, bottom: 520 },
      { left: 300, top: 480, right: 730, bottom: 720 },
    ];
    for (const box of boxes) {
      const p = placeGuide(box, DESKTOP, NOMINAL, "right");
      if (!p) continue;
      expect(p.top).toBeGreaterThanOrEqual(0);
      expect(p.left).toBeGreaterThanOrEqual(0);
      expect(p.left + p.width).toBeLessThanOrEqual(DESKTOP.width);
      expect(p.top + p.width * GUIDE_RATIO).toBeLessThanOrEqual(DESKTOP.height);
    }
  });
});
