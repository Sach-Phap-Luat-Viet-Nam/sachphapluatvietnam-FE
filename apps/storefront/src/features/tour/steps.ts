import type { Alignment, Side } from "driver.js";
import type { TourTarget } from "@/lib/tour-anchor";

/**
 * Tư thế của nhân vật hướng dẫn ở từng bước (xem bảng ở docs/features/storefront-tour.md). Tên theo nội dung ảnh để chọn
 * đúng bước: `welcome` tay mở chào, `point` chỉ vào một nút, `present` giới thiệu một khu nội dung, `open` hai tay mở sang
 * hai bên, `calm` đứng thẳng hai tay đan nhau, `search` cầm kính lúp, `books` giơ hai cuốn sách, `support` đeo tai nghe
 * tư vấn, `confident` khoanh tay mỉm cười, `study` ôm cuốn vở, `cheer` like và OK lúc kết thúc.
 */
export type GuidePose =
  "welcome" | "point" | "present" | "open" | "calm" | "search" | "books" | "support" | "confident" | "study" | "cheer";
export interface TourStep {
  /** `null`: bước giới thiệu chung, hộp text nằm giữa màn hình. */
  target: TourTarget | null;
  title: string;
  description: string;
  pose: GuidePose;
  side?: Side;
  align?: Alignment;
}

/**
 * Ảnh nhân vật theo tư thế, đặt trong `public/tour/`: WebP nền trong suốt, người đặt sát đáy khung. Hầu hết ảnh dọc tỉ
 * lệ 4:5 (480×600); `open` (720×471) là ảnh ngang vì hai tay giơ ra hai bên, cắt 4:5 sẽ mất tay.
 */
export const GUIDE_IMAGES: Record<GuidePose, string> = {
  welcome: "/tour/guide-welcome.webp",
  point: "/tour/guide-point.webp",
  present: "/tour/guide-present.webp",
  open: "/tour/guide-open.webp",
  calm: "/tour/guide-calm.webp",
  search: "/tour/guide-search.webp",
  books: "/tour/guide-books.webp",
  support: "/tour/guide-support.webp",
  confident: "/tour/guide-confident.webp",
  study: "/tour/guide-study.webp",
  cheer: "/tour/guide-cheer.webp",
};

/**
 * Khung ảnh từng tư thế: `ratio` là cao/rộng của file ảnh, `scale` nhân vào bề rộng chuẩn để đầu nhân vật to bằng các
 * ảnh khác (ảnh ngang có người nhỏ hơn trong khung nên phải hiện rộng hơn).
 */
export const GUIDE_SHAPE: Record<GuidePose, { ratio: number; scale: number; width: number; height: number }> = {
  welcome: { ratio: 1.25, scale: 1, width: 480, height: 600 },
  point: { ratio: 1.25, scale: 1, width: 480, height: 600 },
  present: { ratio: 1.25, scale: 1, width: 480, height: 600 },
  open: { ratio: 471 / 720, scale: 1.5, width: 720, height: 471 },
  calm: { ratio: 1.25, scale: 1, width: 480, height: 600 },
  search: { ratio: 1.25, scale: 1, width: 480, height: 600 },
  books: { ratio: 1.25, scale: 1, width: 480, height: 600 },
  support: { ratio: 1.25, scale: 1, width: 480, height: 600 },
  confident: { ratio: 1.25, scale: 1, width: 480, height: 600 },
  study: { ratio: 1.25, scale: 1, width: 480, height: 600 },
  cheer: { ratio: 1.25, scale: 1, width: 480, height: 600 },
};

/**
 * Cử chỉ trong ảnh gốc hướng về bên nào. Nhân vật đứng bên trái hộp thì cần cử chỉ hướng phải (vào hộp), đứng bên phải
 * thì hướng trái; ảnh có hướng ngược lại sẽ được lật ngang. `cheer` (like và OK), `open`, `calm` và các ảnh đứng thẳng đối xứng nên coi như
 * hướng phải.
 */
export const GUIDE_FACING: Record<GuidePose, "left" | "right"> = {
  welcome: "left",
  point: "right",
  present: "right",
  open: "right",
  calm: "right",
  search: "right",
  books: "right",
  support: "right",
  confident: "right",
  study: "right",
  cheer: "right",
};

/** Các bước ở trang chủ, xếp từ trên xuống dưới để trang chỉ cuộn một chiều. */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    target: null,
    pose: "welcome",
    title: "Chào mừng bạn đến Sách Luật Việt Nam",
    description:
      "Mình là trợ lý của tủ sách. Chỉ mất khoảng một phút, mình dẫn bạn xem qua các chức năng chính nhé. Bạn có thể bỏ qua bất cứ lúc nào.",
  },
  {
    target: "promo-bar",
    pose: "point",
    side: "bottom",
    title: "Ưu đãi và giao hàng",
    description:
      "Dải chữ chạy đầu trang nhắc ưu đãi miễn phí vận chuyển và cách thanh toán. Rê chuột vào để dừng, bấm X để thu gọn.",
  },
  {
    target: "search",
    pose: "search",
    side: "bottom",
    title: "Tìm sách",
    description:
      "Gõ tên sách hoặc mã ISBN rồi bấm Tìm. Ở trang kết quả, bạn lọc thêm được theo danh mục, loại sách và giá.",
  },
  {
    target: "theme",
    pose: "calm",
    side: "bottom",
    align: "end",
    title: "Giao diện sáng / tối",
    description: "Đổi qua lại giao diện sáng và tối cho dễ đọc. Đã đăng nhập thì lựa chọn được lưu vào tài khoản.",
  },
  {
    target: "cart",
    pose: "study",
    side: "bottom",
    align: "end",
    title: "Giỏ hàng",
    description:
      "Con số trên biểu tượng là số cuốn đang có trong giỏ. Bấm vào để xem giỏ và đặt hàng, không cần tài khoản vẫn mua được.",
  },
  {
    target: "account",
    pose: "confident",
    side: "bottom",
    align: "end",
    title: "Tài khoản",
    description:
      "Đăng nhập để lưu địa chỉ giao hàng và theo dõi đơn. Khi đã đăng nhập, tên bạn và mục Đơn của tôi hiện ở đây.",
  },
  {
    target: "explore",
    pose: "books",
    side: "top",
    align: "start",
    title: "Khám phá tủ sách",
    description: "Xem toàn bộ sách đang bán, lọc và sắp xếp theo nhu cầu của bạn.",
  },
  {
    target: "categories",
    pose: "present",
    side: "bottom",
    align: "start",
    title: "Danh mục",
    description:
      "Chọn một lĩnh vực luật để xem ngay các sách thuộc lĩnh vực đó. Trên điện thoại, vuốt ngang để xem thêm.",
  },
  {
    target: "offers",
    pose: "open",
    side: "top",
    title: "Ưu đãi đang chạy",
    description: "Lỡ tắt quảng cáo lúc mới vào? Bấm vào thẻ ở đây để xem lại chương trình khuyến mãi.",
  },
  {
    target: "book",
    pose: "point",
    side: "right",
    align: "start",
    title: "Xem nhanh và mua",
    description:
      "Bấm vào bìa hoặc tên sách để xem nhanh giá và văn bản được cập nhật đến đâu. Nút bên dưới bìa để thêm vào giỏ hoặc mua ngay.",
  },
  {
    target: "zalo",
    pose: "support",
    side: "top",
    align: "end",
    title: "Tư vấn qua Zalo",
    description: "Cần hỏi sách nào phù hợp, phí giao hàng hay tình trạng đơn? Nhắn Zalo để được tư vấn trực tiếp.",
  },
  {
    target: "order-lookup",
    pose: "search",
    side: "top",
    align: "start",
    title: "Tra cứu đơn hàng",
    description: "Đặt hàng không cần tài khoản vẫn xem được tình trạng đơn: nhập mã đơn và số điện thoại ở đây.",
  },
  {
    target: "replay",
    pose: "cheer",
    side: "left",
    align: "end",
    title: "Vậy là xong!",
    description: "Muốn xem lại hướng dẫn này thì bấm vào nút này. Chúc bạn tìm được cuốn sách ưng ý!",
  },
];

/**
 * Bỏ các bước có phần tử không có trên trang (ví dụ backend lỗi nên khu danh mục bị ẩn, chưa có ưu đãi nào) để bộ
 * đếm "2/10" không đếm cả bước bị bỏ qua.
 */
export function availableSteps(steps: readonly TourStep[], isPresent: (target: TourTarget) => boolean): TourStep[] {
  return varyPoses(steps.filter((step) => step.target === null || isPresent(step.target)));
}

const POSE_CYCLE: readonly GuidePose[] = [
  "welcome",
  "point",
  "present",
  "open",
  "calm",
  "search",
  "books",
  "support",
  "confident",
  "study",
  "cheer",
];

/**
 * Bỏ bước có thể làm hai bước liền kề trùng tư thế (nhân vật lặp lại 2–3 lần liền trông chán): bước nào trùng bước
 * trước thì đổi sang tư thế kế tiếp trong vòng xoay mà cũng không trùng bước sau.
 */
export function varyPoses(steps: readonly TourStep[]): TourStep[] {
  const result: TourStep[] = [];
  steps.forEach((step, index) => {
    const previous = result[index - 1]?.pose;
    if (step.pose !== previous) {
      result.push(step);
      return;
    }
    const next = steps[index + 1]?.pose;
    const start = POSE_CYCLE.indexOf(step.pose);
    const pose =
      Array.from({ length: POSE_CYCLE.length - 1 }, (_, i) => POSE_CYCLE[(start + i + 1) % POSE_CYCLE.length]).find(
        (p) => p !== previous && p !== next,
      ) ?? step.pose;
    result.push({ ...step, pose: pose ?? step.pose });
  });
  return result;
}
