/** "300.000đ": cách viết gọn trên thanh ưu đãi và chân trang (không có khoảng trắng và ký hiệu ₫ như `formatPrice`). */
function shortMoney(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

/**
 * Câu quảng cáo miễn phí vận chuyển theo ngưỡng lấy từ backend (`freeShippingThreshold` của `POST /shipping/quote`).
 * `null` khi shop không bật miễn ship theo ngưỡng hoặc chưa lấy được dữ liệu: không hiện câu này thay vì đoán số.
 */
export function freeShippingText(threshold: number | null): string | null {
  return threshold !== null && threshold > 0 ? `Miễn phí vận chuyển cho đơn từ ${shortMoney(threshold)}` : null;
}
