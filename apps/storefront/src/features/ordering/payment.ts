import type { PaymentMethod } from "./order-forms";

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

/**
 * Tài khoản nhận chuyển khoản. Backend chưa có API nên hiển thị nội dung tĩnh (docs/api_reference.md); điền khi Sách
 * Luật Việt Nam cung cấp. `null` thì ẩn lựa chọn chuyển khoản để khách không đặt đơn mà không biết chuyển tiền vào đâu.
 */
export const BANK_ACCOUNT: BankAccount | null = null;

/** Phương thức thanh toán cho khách chọn: chuyển khoản chỉ hiện khi đã cấu hình tài khoản nhận tiền. */
export function availablePaymentMethods(bankAccount: BankAccount | null): PaymentMethod[] {
  return bankAccount ? ["cod", "bank_transfer"] : ["cod"];
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
