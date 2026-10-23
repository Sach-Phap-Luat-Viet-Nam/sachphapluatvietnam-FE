const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

/**
 * Định dạng số tiền VNĐ để hiển thị, ví dụ `185000` → `185.000 ₫`.
 * Backend luôn trả số nguyên VNĐ; hàm này không làm tròn hay tính toán giá.
 */
export function formatPrice(amount: number): string {
  // Intl dùng NBSP giữa số và ký hiệu tiền; đổi sang khoảng trắng thường để so sánh/test ổn định.
  return vndFormatter.format(amount).replace(/\u00a0/g, " ");
}

/** Định dạng phần trăm giảm giá, ví dụ `15` → `-15%`. Trả `null` khi không giảm. */
export function formatDiscount(percent: number | null | undefined): string | null {
  if (percent === null || percent === undefined || percent <= 0) {
    return null;
  }

  return `-${percent}%`;
}
