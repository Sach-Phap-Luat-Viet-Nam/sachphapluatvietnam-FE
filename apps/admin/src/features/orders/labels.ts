import type { BadgeTone } from "@/components/StatusBadge";

// Giá trị enum (snake_case) và nhãn tiếng Việt theo "Bảng enum" trong docs/api_reference.md.

export const ORDER_STATUSES = [
  "pending_payment",
  "pending_confirm",
  "preorder_waiting",
  "paid",
  "confirmed",
  "packing",
  "ready_to_ship",
  "shipping",
  "delivered",
  "completed",
  "return_requested",
  "returning",
  "returned",
  "refunded",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
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

/** Phương thức đang hỗ trợ (VNPAY, MoMo, ZaloPay chưa có) nhưng nhãn đủ cả để hiển thị đơn lạ. */
export const PAYMENT_METHOD_FILTERS = ["cod", "bank_transfer"] as const;
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
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
  partial_refund: "Hoàn một phần",
};

export const COVER_TYPE_LABELS: Record<string, string> = { paperback: "Bìa mềm", hardcover: "Bìa cứng" };

// Màu theo nhóm: chờ xử lý (vàng), đang xử lý (xanh navy), đã giao (xanh lá), đã đóng (xám), hủy (đỏ).
const ORDER_STATUS_TONES: Record<string, BadgeTone> = {
  pending_payment: "warning",
  pending_confirm: "warning",
  preorder_waiting: "warning",
  return_requested: "warning",
  paid: "info",
  confirmed: "info",
  packing: "info",
  ready_to_ship: "info",
  shipping: "info",
  returning: "info",
  delivered: "success",
  completed: "success",
  returned: "neutral",
  refunded: "neutral",
  cancelled: "danger",
};

const PAYMENT_STATUS_TONES: Record<string, BadgeTone> = {
  unpaid: "warning",
  paid: "success",
  refunded: "neutral",
  partial_refund: "neutral",
};

export function orderStatusTone(status: string): BadgeTone {
  return ORDER_STATUS_TONES[status] ?? "neutral";
}

export function paymentStatusTone(status: string): BadgeTone {
  return PAYMENT_STATUS_TONES[status] ?? "neutral";
}

/** Tác động kèm theo khi chuyển sang trạng thái (bảng "Admin — Đơn hàng" trong docs/api_reference.md). */
export function transitionEffect(status: string, paymentMethod: string): string | null {
  switch (status) {
    case "paid":
      return "Ghi nhận đơn đã thanh toán (đối soát chuyển khoản thủ công).";
    case "packing":
      return "Trừ tồn kho thật theo lô in (lô nhập trước xuất trước) và ghi giá vốn từng dòng.";
    case "cancelled":
      return "Hoàn lại số sách đang giữ cho đơn vào tồn khả dụng.";
    case "delivered":
      return paymentMethod === "cod" ? "Đơn COD: ghi nhận đã thu tiền." : null;
    case "returned":
      return "Nhập lại kho đúng các lô đã xuất cho đơn.";
    case "refunded":
      return "Chỉ áp dụng cho đơn đã thanh toán; ghi nhận đã hoàn tiền.";
    default:
      return null;
  }
}

/** Chuyển trạng thái khó quay lại (hủy, hoàn tiền): hỏi lại và dùng nút màu đỏ. */
export function isDestructiveTransition(status: string): boolean {
  return status === "cancelled" || status === "refunded";
}
