export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface GuidePlacement {
  left: number;
  top: number;
  width: number;
  /** Lật ngang ảnh để cử chỉ hướng vào hộp text. */
  flip: boolean;
  side: "top" | "right" | "left" | "bottom";
}

/** Tỉ lệ cao/rộng mặc định của ảnh nhân vật (4:5). Ảnh có khung khác (ảnh ngang) truyền `ratio` riêng. */
export const GUIDE_RATIO = 1.25;
/** Tỉ lệ ảnh nằm khuất sau hộp text: nhân vật "đứng sau hộp", chỉ thò đầu và tay ra, không che chữ trong hộp. */
const TUCK = 0.3;
/** Ảnh có thể thu nhỏ tới tỉ lệ này của cỡ chuẩn nếu chỗ trống không đủ; nhỏ hơn thì bỏ phía đó. */
const MIN_SCALE = 0.6;
const MARGIN = 8;
/** Khoảng cách giữa ảnh và phần tử đang giới thiệu để ảnh không dính sát vào lỗ sáng. */
const AVOID_PADDING = 12;
/** Khoảng hở giữa hộp và ảnh khi nhân vật đứng phía dưới hộp (không thể khuất sau hộp vì sẽ mất đầu). */
const BOTTOM_GAP = 6;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

interface Viewport {
  width: number;
  height: number;
}

function intersects(a: Box, b: Box): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * Chọn chỗ đặt nhân vật quanh hộp text, ưu tiên phía trên, bên phải, bên trái rồi phía dưới, miễn là đủ chỗ trong màn
 * hình và **không che phần tử đang được giới thiệu** (`avoid`, thường là nút được khoanh sáng). Đặt ảnh theo
 * `position: fixed` và tự tính ở đây vì driver.js chỉ giữ khung hộp trong màn hình, không biết phần ảnh nhô ra ngoài.
 * Ở phía trên/phải/trái ảnh nằm dưới hộp (z-index thấp hơn) nên phần chồng lên hộp bị hộp che đi.
 *
 * `faces`: cử chỉ trong ảnh gốc hướng về bên nào; ảnh đứng bên trái/trên/dưới hộp cần hướng phải, bên phải hộp cần
 * hướng trái. Trả `null` khi không phía nào đủ chỗ (điện thoại, hộp chiếm gần hết màn hình).
 */
export function placeGuide(
  box: Box,
  viewport: Viewport,
  nominalWidth: number,
  faces: "left" | "right",
  avoid?: Box,
  ratio: number = GUIDE_RATIO,
): GuidePlacement | null {
  const maxByHeight = (viewport.height - 2 * MARGIN) / ratio;
  const fits: Array<[GuidePlacement["side"], number]> = [
    ["top", (box.top - MARGIN) / (ratio * (1 - TUCK))],
    ["right", Math.min((viewport.width - MARGIN - box.right) / (1 - TUCK), maxByHeight)],
    ["left", Math.min((box.left - MARGIN) / (1 - TUCK), maxByHeight)],
    ["bottom", (viewport.height - MARGIN - box.bottom - BOTTOM_GAP) / ratio],
  ];
  const avoidArea: Box | undefined = avoid && {
    left: avoid.left - AVOID_PADDING,
    top: avoid.top - AVOID_PADDING,
    right: avoid.right + AVOID_PADDING,
    bottom: avoid.bottom + AVOID_PADDING,
  };

  const usable: GuidePlacement[] = [];
  for (const [side, fit] of fits) {
    const width = Math.min(nominalWidth, fit);
    if (width < nominalWidth * MIN_SCALE) {
      continue;
    }
    const placement = build(side, width, ratio, box, viewport, faces);
    const area = {
      left: placement.left,
      top: placement.top,
      right: placement.left + width,
      bottom: placement.top + width * ratio,
    };
    if (avoidArea && intersects(area, avoidArea)) {
      continue;
    }
    usable.push(placement);
  }
  return (
    usable.find((placement) => placement.width >= nominalWidth) ??
    usable.reduce<GuidePlacement | null>(
      (best, placement) => (best && best.width >= placement.width ? best : placement),
      null,
    )
  );
}

function build(
  side: GuidePlacement["side"],
  width: number,
  ratio: number,
  box: Box,
  viewport: Viewport,
  faces: "left" | "right",
): GuidePlacement {
  const height = width * ratio;
  if (side === "top" || side === "bottom") {
    return {
      side,
      width,
      left: clamp(box.left + 16, MARGIN, viewport.width - width - MARGIN),
      top: side === "top" ? box.top - height * (1 - TUCK) : box.bottom + BOTTOM_GAP,
      flip: faces !== "right",
    };
  }
  const top = clamp(box.bottom - height, MARGIN, viewport.height - height - MARGIN);
  return side === "right"
    ? { side, width, left: box.right - width * TUCK, top, flip: faces !== "left" }
    : { side, width, left: box.left - width * (1 - TUCK), top, flip: faces !== "right" };
}
