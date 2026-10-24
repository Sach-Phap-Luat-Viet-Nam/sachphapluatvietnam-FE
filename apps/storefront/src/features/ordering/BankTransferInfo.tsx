import { cn } from "@slvn/ui";
import { formatPrice } from "@slvn/utils";
import { PaymentCountdown } from "./PaymentCountdown";
import type { BankAccount } from "./payment";
import type { Order } from "./schemas";

/** Đơn chuyển khoản chưa nhận tiền: cần hiện hướng dẫn chuyển khoản và đồng hồ đếm ngược. */
export function isAwaitingTransfer(order: Pick<Order, "paymentMethod" | "paymentStatus" | "status">): boolean {
  return order.paymentMethod === "bank_transfer" && order.paymentStatus === "unpaid" && order.status !== "cancelled";
}

export interface BankTransferInfoProps {
  order: Order;
  bankAccount: BankAccount;
  className?: string;
}

/** Thông tin chuyển khoản cho một đơn: tài khoản nhận, số tiền, nội dung = mã đơn, thời hạn còn lại. */
export function BankTransferInfo({ order, bankAccount, className }: BankTransferInfoProps) {
  return (
    <div className={cn("border-upcoming/50 flex flex-col gap-3 border px-5 py-5", className)}>
      <h3 className="font-editorial text-xl font-bold">Chuyển khoản để hoàn tất đơn</h3>
      <dl className="grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-[auto_1fr]">
        <dt className="text-sand">Ngân hàng</dt>
        <dd>{bankAccount.bankName}</dd>
        <dt className="text-sand">Số tài khoản</dt>
        <dd className="font-semibold tracking-wide">{bankAccount.accountNumber}</dd>
        <dt className="text-sand">Chủ tài khoản</dt>
        <dd>{bankAccount.accountName}</dd>
        <dt className="text-sand">Số tiền</dt>
        <dd className="text-gold-pale font-semibold">{formatPrice(order.total)}</dd>
        <dt className="text-sand">Nội dung</dt>
        <dd className="font-semibold tracking-wide">{order.orderCode}</dd>
      </dl>
      {order.paymentExpiresAt && <PaymentCountdown expiresAt={order.paymentExpiresAt} />}
    </div>
  );
}
