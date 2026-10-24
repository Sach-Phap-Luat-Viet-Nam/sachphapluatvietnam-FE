import { formatCountdown } from "./format-countdown";

describe("formatCountdown", () => {
  it("định dạng mm:ss, làm tròn lên giây", () => {
    expect(formatCountdown(900_000)).toBe("15:00");
    expect(formatCountdown(61_001)).toBe("01:02");
    expect(formatCountdown(999)).toBe("00:01");
  });

  it("hết giờ thì là 00:00", () => {
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(-5_000)).toBe("00:00");
  });
});
