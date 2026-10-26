import type { Order } from "./schemas";

/** Đơn chuyển khoản chưa nhận tiền: cần hiện hướng dẫn chuyển khoản và theo dõi để tự cập nhật khi tiền về. */
export function isAwaitingTransfer(order: Pick<Order, "paymentMethod" | "paymentStatus" | "status">): boolean {
  return order.paymentMethod === "bank_transfer" && order.paymentStatus === "unpaid" && order.status !== "cancelled";
}

/** Chu kỳ hỏi lại đơn đang chờ chuyển khoản (ms) để biết SePay đã xác nhận tiền chưa. */
export const MEMBER_POLL_MS = 5_000;
/** Khách vãng lai tra cứu bằng mã + SĐT, giới hạn 10 request/phút/IP nên hỏi thưa hơn. */
export const GUEST_POLL_MS = 15_000;

/** `false` khi không cần theo dõi nữa (đã thanh toán, đã hủy, không phải chuyển khoản). */
export function paymentPollInterval(order: Order | undefined, member: boolean): number | false {
  if (!order || !isAwaitingTransfer(order)) return false;
  return member ? MEMBER_POLL_MS : GUEST_POLL_MS;
}

/** Ảnh QR chỉ nạp từ địa chỉ https do backend trả, tránh nhúng URL lạ. */
export function safeQrUrl(qrUrl: string): string | null {
  try {
    return new URL(qrUrl).protocol === "https:" ? qrUrl : null;
  } catch {
    return null;
  }
}

/** Số giây còn lại tới hạn thanh toán (`paymentExpiresAt`), không âm. */
export function remainingSeconds(expiresAt: string, now: Date): number {
  const deadline = new Date(expiresAt).getTime();
  if (Number.isNaN(deadline)) return 0;
  return Math.max(0, Math.floor((deadline - now.getTime()) / 1000));
}

/** `1799` → `29:59`. */
export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
