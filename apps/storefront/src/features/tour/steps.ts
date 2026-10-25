import type { Alignment, Side } from "driver.js";
import type { TourTarget } from "@/lib/tour-anchor";

/** Tư thế của nhân vật hướng dẫn ở từng bước. */
export type GuidePose = "wave" | "point" | "book" | "cheer";

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
 * Ảnh nhân vật theo tư thế, đặt trong `public/tour/` (WebP nền trong suốt, tỉ lệ 4:5, 264×330 cho màn hình độ phân giải
 * cao). Hiện mới có một ảnh (tay mở giới thiệu) dùng chung cho mọi tư thế; có thêm ảnh thì đổi đường dẫn ở đây.
 */
export const GUIDE_IMAGES: Record<GuidePose, string> = {
  wave: "/tour/guide-presenter.webp",
  point: "/tour/guide-presenter.webp",
  book: "/tour/guide-presenter.webp",
  cheer: "/tour/guide-presenter.webp",
};

/** Các bước ở trang chủ, xếp từ trên xuống dưới để trang chỉ cuộn một chiều. */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    target: null,
    pose: "wave",
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
    pose: "point",
    side: "bottom",
    title: "Tìm sách",
    description:
      "Gõ tên sách hoặc mã ISBN rồi bấm Tìm. Ở trang kết quả, bạn lọc thêm được theo danh mục, loại sách và giá.",
  },
  {
    target: "theme",
    pose: "point",
    side: "bottom",
    align: "end",
    title: "Giao diện sáng / tối",
    description: "Đổi qua lại giao diện sáng và tối cho dễ đọc. Đã đăng nhập thì lựa chọn được lưu vào tài khoản.",
  },
  {
    target: "cart",
    pose: "point",
    side: "bottom",
    align: "end",
    title: "Giỏ hàng",
    description:
      "Con số trên biểu tượng là số cuốn đang có trong giỏ. Bấm vào để xem giỏ và đặt hàng, không cần tài khoản vẫn mua được.",
  },
  {
    target: "account",
    pose: "point",
    side: "bottom",
    align: "end",
    title: "Tài khoản",
    description:
      "Đăng nhập để lưu địa chỉ giao hàng và theo dõi đơn. Khi đã đăng nhập, tên bạn và mục Đơn của tôi hiện ở đây.",
  },
  {
    target: "explore",
    pose: "book",
    side: "top",
    align: "start",
    title: "Khám phá tủ sách",
    description: "Xem toàn bộ sách đang bán, lọc và sắp xếp theo nhu cầu của bạn.",
  },
  {
    target: "categories",
    pose: "book",
    side: "bottom",
    align: "start",
    title: "Danh mục",
    description:
      "Chọn một lĩnh vực luật để xem ngay các sách thuộc lĩnh vực đó. Trên điện thoại, vuốt ngang để xem thêm.",
  },
  {
    target: "offers",
    pose: "point",
    side: "top",
    title: "Ưu đãi đang chạy",
    description: "Lỡ tắt quảng cáo lúc mới vào? Bấm vào thẻ ở đây để xem lại chương trình khuyến mãi.",
  },
  {
    target: "book",
    pose: "book",
    side: "right",
    align: "start",
    title: "Xem nhanh và mua",
    description:
      "Bấm vào bìa hoặc tên sách để xem nhanh giá và văn bản được cập nhật đến đâu. Nút bên dưới bìa để thêm vào giỏ hoặc mua ngay.",
  },
  {
    target: "zalo",
    pose: "point",
    side: "top",
    align: "end",
    title: "Tư vấn qua Zalo",
    description: "Cần hỏi sách nào phù hợp, phí giao hàng hay tình trạng đơn? Nhắn Zalo để được tư vấn trực tiếp.",
  },
  {
    target: "order-lookup",
    pose: "point",
    side: "top",
    align: "start",
    title: "Tra cứu đơn hàng",
    description: "Đặt hàng không cần tài khoản vẫn xem được tình trạng đơn: nhập mã đơn và số điện thoại ở đây.",
  },
  {
    target: "replay",
    pose: "cheer",
    side: "top",
    align: "start",
    title: "Vậy là xong!",
    description:
      "Muốn xem lại hướng dẫn này thì bấm “Xem hướng dẫn sử dụng” ở cuối trang. Chúc bạn tìm được cuốn sách ưng ý!",
  },
];

/**
 * Bỏ các bước có phần tử không có trên trang (ví dụ backend lỗi nên khu danh mục bị ẩn, chưa có ưu đãi nào) để bộ
 * đếm "2/10" không đếm cả bước bị bỏ qua.
 */
export function availableSteps(steps: readonly TourStep[], isPresent: (target: TourTarget) => boolean): TourStep[] {
  return steps.filter((step) => step.target === null || isPresent(step.target));
}
