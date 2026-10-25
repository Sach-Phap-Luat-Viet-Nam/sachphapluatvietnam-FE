import { describe, expect, it } from "vitest";
import { tourAnchor, tourSelector } from "@/lib/tour-anchor";
import { TOUR_STEPS, availableSteps } from "./steps";

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
