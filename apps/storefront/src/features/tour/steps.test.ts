import { describe, expect, it } from "vitest";
import { tourAnchor, tourSelector } from "@/lib/tour-anchor";
import { GUIDE_IMAGES, GUIDE_SHAPE, TOUR_STEPS, availableSteps } from "./steps";
import type { GuidePose } from "./steps";

describe("availableSteps", () => {
  it("keeps every step when all targets are on the page", () => {
    expect(availableSteps(TOUR_STEPS, () => true)).toEqual(TOUR_STEPS);
  });

  it("drops steps whose target is missing but keeps the intro", () => {
    const steps = availableSteps(TOUR_STEPS, (target) => target !== "offers" && target !== "categories");
    const targets = steps.map((step) => step.target);
    expect(targets).not.toContain("offers");
    expect(targets).not.toContain("categories");
    expect(targets[0]).toBeNull();
    expect(steps).toHaveLength(TOUR_STEPS.length - 2);
  });
});

describe("pose variety", () => {
  const samePoseNeighbours = (steps: readonly { pose: string }[]) =>
    steps.some((step, index) => index > 0 && step.pose === steps[index - 1]?.pose);

  it("never puts the same pose on two neighbouring steps", () => {
    expect(samePoseNeighbours(TOUR_STEPS)).toBe(false);
  });

  it("keeps that true when steps are dropped and neighbours become equal", () => {
    const targets = TOUR_STEPS.map((step) => step.target);
    for (const hidden of targets) {
      if (hidden === null) continue;
      expect(samePoseNeighbours(availableSteps(TOUR_STEPS, (target) => target !== hidden))).toBe(false);
    }
    const onlyEnds = availableSteps(
      TOUR_STEPS,
      (target) => target === "search" || target === "book" || target === "replay",
    );
    expect(samePoseNeighbours(onlyEnds)).toBe(false);
  });

  it("uses every pose so the guide does not look repetitive", () => {
    expect(new Set(TOUR_STEPS.map((step) => step.pose)).size).toBe(Object.keys(GUIDE_IMAGES).length);
  });

  it("describes the shape of every pose image", () => {
    for (const pose of Object.keys(GUIDE_IMAGES) as GuidePose[]) {
      const { ratio, width, height } = GUIDE_SHAPE[pose];
      expect(ratio).toBeCloseTo(height / width, 3);
    }
  });
});

describe("tour anchors", () => {
  it("matches the selector used to find the element", () => {
    document.body.innerHTML = `<button data-tour="${tourAnchor("cart")["data-tour"]}">Giỏ</button>`;
    expect(document.querySelector(tourSelector("cart"))).not.toBeNull();
  });

  it("starts with the welcome step and ends on the replay hint", () => {
    expect(TOUR_STEPS[0]?.target).toBeNull();
    expect(TOUR_STEPS.at(-1)?.target).toBe("replay");
  });
});
