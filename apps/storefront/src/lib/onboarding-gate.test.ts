import { afterEach, describe, expect, it } from "vitest";
import { isTourActive, setTourActive, waitForTourIdle } from "./onboarding-gate";

afterEach(() => setTourActive(false));

describe("onboarding gate", () => {
  it("resolves at once when no tour is running", async () => {
    await expect(waitForTourIdle()).resolves.toBeUndefined();
  });

  it("holds waiters until the tour ends", async () => {
    setTourActive(true);
    let released = false;
    const waiting = waitForTourIdle().then(() => {
      released = true;
    });
    await Promise.resolve();
    expect(released).toBe(false);
    expect(isTourActive()).toBe(true);

    setTourActive(false);
    await waiting;
    expect(released).toBe(true);
  });
});
