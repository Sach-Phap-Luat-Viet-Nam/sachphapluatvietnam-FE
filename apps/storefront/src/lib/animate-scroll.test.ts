import { SLIDE_DURATION_MS, animateScrollLeft, easeInOutCubic } from "./animate-scroll";

function track(scrollLeft = 0) {
  const element = document.createElement("ul");
  element.style.scrollSnapType = "x mandatory";
  // jsdom không có layout nên `scrollLeft` là hằng 0; thay bằng thuộc tính ghi nhớ giá trị.
  let value = scrollLeft;
  Object.defineProperty(element, "scrollLeft", { get: () => value, set: (next: number) => (value = next) });
  return element;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("easeInOutCubic", () => {
  it("đi từ 0 tới 1, chậm ở hai đầu và nhanh ở giữa", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
    expect(easeInOutCubic(0.9)).toBeGreaterThan(0.9);
  });
});

describe("animateScrollLeft", () => {
  it("cuộn dần tới đích trong thời lượng đã cho rồi trả lại scroll-snap", () => {
    const element = track();
    const onFinish = vi.fn();

    animateScrollLeft(element, 1000, SLIDE_DURATION_MS, onFinish);
    expect(element.style.scrollSnapType).toBe("none");

    vi.advanceTimersByTime(SLIDE_DURATION_MS / 2);
    expect(element.scrollLeft).toBeGreaterThan(0);
    expect(element.scrollLeft).toBeLessThan(1000);
    expect(onFinish).not.toHaveBeenCalled();

    vi.advanceTimersByTime(SLIDE_DURATION_MS);
    expect(element.scrollLeft).toBe(1000);
    expect(element.style.scrollSnapType).toBe("x mandatory");
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("cuộn được về phía trái", () => {
    const element = track(2000);

    animateScrollLeft(element, 0, 100);
    vi.advanceTimersByTime(200);

    expect(element.scrollLeft).toBe(0);
  });

  it("hủy giữa chừng thì dừng tại chỗ, trả scroll-snap và chỉ báo xong một lần", () => {
    const element = track();
    const onFinish = vi.fn();
    const animation = animateScrollLeft(element, 1000, 900, onFinish);
    vi.advanceTimersByTime(300);
    const stoppedAt = element.scrollLeft;

    animation.cancel();
    animation.cancel();
    vi.advanceTimersByTime(900);

    expect(element.scrollLeft).toBe(stoppedAt);
    expect(element.style.scrollSnapType).toBe("x mandatory");
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
