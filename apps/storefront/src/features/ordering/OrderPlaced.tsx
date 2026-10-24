"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import { cn } from "@slvn/ui";
import { formatPrice } from "@slvn/utils";
import { SUBMIT } from "@/components/form-styles";
import { OrderDetails } from "./OrderDetails";
import { PaymentCountdown } from "./PaymentCountdown";
import type { BankAccount } from "./payment";
import type { Order } from "./schemas";

export interface OrderPlacedProps {
  order: Order;
  bankAccount: BankAccount | null;
}

/** Màn cảm ơn sau khi tạo đơn: mã đơn, hướng dẫn chuyển khoản (nếu có) và chi tiết đơn. */
export function OrderPlaced({ order, bankAccount }: OrderPlacedProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Form vừa biến mất: đưa focus (và cuộn) tới tiêu đề để trình đọc màn hình đọc ngay kết quả.
    heading.current?.focus();
  }, []);

  const waitingTransfer = order.paymentMethod === "bank_transfer" && order.paymentStatus === "unpaid";
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="order-placed-title" className="border-gold/30 bg-panel border px-6 py-9 sm:px-10">
        <p className="text-ok flex items-center gap-2.5 text-sm font-medium">
          <CircleCheck size={20} /> Đặt hàng thành công
        </p>
        <h2
          id="order-placed-title"
          ref={heading}
          tabIndex={-1}
          className="font-editorial mt-3 text-3xl font-bold outline-none sm:text-4xl"
        >
          Cảm ơn bạn đã đặt sách
        </h2>
        <p className="text-sand mt-4">
          Mã đơn hàng:{" "}
          <strong className="text-gold-pale font-editorial text-2xl tracking-wide">{order.orderCode}</strong>
        </p>
        <p className="text-mist mt-3 max-w-2xl leading-7">
          Bạn lưu lại mã đơn và số điện thoại đặt hàng ({order.phone}) để tra cứu tình trạng đơn bất cứ lúc nào.
        </p>

        {waitingTransfer && bankAccount && (
          <div className="border-upcoming/50 mt-7 flex flex-col gap-3 border px-5 py-5">
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
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/sach" className={cn(SUBMIT, "px-7")}>
            Tiếp tục mua sách <ArrowRight size={18} />
          </Link>
          <Link
            href={`/don-hang/tra-cuu?ma=${encodeURIComponent(order.orderCode)}`}
            className="border-ivory/30 hover:border-gold flex min-h-13.5 items-center border px-7 transition-colors"
          >
            Tra cứu đơn hàng
          </Link>
        </div>
      </section>

      <OrderDetails order={order} />
    </div>
  );
}
