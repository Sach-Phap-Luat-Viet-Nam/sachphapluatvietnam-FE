import Image from "next/image";
import { cn } from "@slvn/ui";
import { formatPrice } from "@slvn/utils";
import { PaymentCountdown } from "./PaymentCountdown";
import { safeQrUrl } from "./payment";
import type { Order } from "./schemas";

export interface BankTransferInfoProps {
  order: Order;
  className?: string;
}

/**
 * Thông tin chuyển khoản của một đơn, lấy từ `order.paymentInstructions` (backend): tài khoản nhận, số tiền, nội dung =
 * mã đơn, mã QR và thời hạn còn lại. Backend chưa cấu hình tài khoản nhận tiền thì chỉ báo khách liên hệ.
 */
export function BankTransferInfo({ order, className }: BankTransferInfoProps) {
  const info = order.paymentInstructions;
  const qrUrl = info ? safeQrUrl(info.qrUrl) : null;
  return (
    <div className={cn("border-upcoming/50 flex flex-col gap-3 border px-5 py-5", className)}>
      <h3 className="font-editorial text-xl font-bold">Chuyển khoản để hoàn tất đơn</h3>
      {info ? (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {qrUrl && (
            // Ảnh động từ SePay, không qua trình tối ưu ảnh của Next.js.
            <Image
              src={qrUrl}
              alt={`Mã QR chuyển khoản ${formatPrice(info.amount)} cho đơn ${info.transferContent}`}
              width={200}
              height={200}
              unoptimized
              className="bg-ivory h-50 w-50 shrink-0"
            />
          )}
          <dl className="grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-[auto_1fr]">
            <dt className="text-sand">Ngân hàng</dt>
            <dd>{info.bankName}</dd>
            <dt className="text-sand">Số tài khoản</dt>
            <dd className="font-semibold tracking-wide">{info.accountNumber}</dd>
            {info.accountName && (
              <>
                <dt className="text-sand">Chủ tài khoản</dt>
                <dd>{info.accountName}</dd>
              </>
            )}
            <dt className="text-sand">Số tiền</dt>
            <dd className="text-gold-pale font-semibold">{formatPrice(info.amount)}</dd>
            <dt className="text-sand">Nội dung</dt>
            <dd className="font-semibold tracking-wide">{info.transferContent}</dd>
          </dl>
        </div>
      ) : (
        <p className="text-sand">
          Chưa có thông tin tài khoản nhận tiền. Vui lòng liên hệ cửa hàng kèm mã đơn {order.orderCode} để được hướng
          dẫn chuyển khoản.
        </p>
      )}
      {info && (
        <p className="text-sand text-sm">
          Chuyển đúng số tiền và nội dung để đơn tự xác nhận trong ít phút. Trang này tự cập nhật khi nhận được tiền.
        </p>
      )}
      {order.paymentExpiresAt && <PaymentCountdown expiresAt={order.paymentExpiresAt} />}
    </div>
  );
}
