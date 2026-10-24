// Nhãn tiếng Việt cho enum đơn hàng (docs/api_reference.md, mục Bảng enum).

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Chờ thanh toán",
  pending_confirm: "Chờ xác nhận",
  preorder_waiting: "Chờ phát hành",
  paid: "Đã thanh toán",
  confirmed: "Chờ xử lý",
  packing: "Đang đóng gói",
  ready_to_ship: "Chờ lấy hàng",
  shipping: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn tất",
  return_requested: "Yêu cầu đổi trả",
  returning: "Đang hoàn hàng",
  returned: "Đã hoàn hàng",
  refunded: "Đã hoàn tiền",
  cancelled: "Đã hủy",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "Thanh toán khi nhận hàng (COD)",
  bank_transfer: "Chuyển khoản ngân hàng",
  vnpay: "VNPAY",
  momo: "MoMo",
  zalopay: "ZaloPay",
};

/** Nhãn ngắn cho danh sách đơn. */
export const PAYMENT_METHOD_SHORT_LABELS: Record<string, string> = {
  cod: "COD",
  bank_transfer: "Chuyển khoản",
  vnpay: "VNPAY",
  momo: "MoMo",
  zalopay: "ZaloPay",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
  partial_refund: "Hoàn tiền một phần",
};

/** Nhóm màu của trạng thái đơn: chờ khách/hệ thống, đang xử lý, đã giao xong, đã đóng (hủy, hoàn). */
export type OrderStatusTone = "waiting" | "active" | "done" | "closed";

export function orderStatusTone(status: string): OrderStatusTone {
  if (status === "pending_payment" || status === "pending_confirm" || status === "preorder_waiting") return "waiting";
  if (status === "delivered" || status === "completed") return "done";
  if (status === "cancelled" || status === "returned" || status === "refunded") return "closed";
  return "active";
}

/** Nhãn của một giá trị enum; giá trị lạ (backend thêm mới) thì hiện nguyên giá trị. */
export function label(labels: Record<string, string>, value: string): string {
  return labels[value] ?? value;
}
