"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import { cn } from "@slvn/ui";
import { SUBMIT } from "@/components/form-styles";
import { useSession } from "@/lib/use-session";
import { BankTransferInfo, isAwaitingTransfer } from "./BankTransferInfo";
import { OrderDetails } from "./OrderDetails";
import type { BankAccount } from "./payment";
import type { Order } from "./schemas";

export interface OrderPlacedProps {
  order: Order;
  bankAccount: BankAccount | null;
}

/** Màn cảm ơn sau khi tạo đơn: mã đơn, hướng dẫn chuyển khoản (nếu có) và chi tiết đơn. */
export function OrderPlaced({ order, bankAccount }: OrderPlacedProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  // Đơn đặt khi đã đăng nhập gắn với tài khoản: xem lại ở "Đơn của tôi"; khách vãng lai tra cứu bằng mã + SĐT.
  const member = useSession().status === "authenticated";

  useEffect(() => {
    // Form vừa biến mất: đưa focus (và cuộn) tới tiêu đề để trình đọc màn hình đọc ngay kết quả.
    heading.current?.focus();
  }, []);

  const code = encodeURIComponent(order.orderCode);
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
          {member
            ? "Đơn đã được lưu trong tài khoản, bạn theo dõi tình trạng đơn ở mục Đơn của tôi."
            : `Bạn lưu lại mã đơn và số điện thoại đặt hàng (${order.phone}) để tra cứu tình trạng đơn bất cứ lúc nào.`}
        </p>

        {isAwaitingTransfer(order) && bankAccount && (
          <BankTransferInfo order={order} bankAccount={bankAccount} className="mt-7" />
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/sach" className={cn(SUBMIT, "px-7")}>
            Tiếp tục mua sách <ArrowRight size={18} />
          </Link>
          <Link
            href={member ? `/don-hang/${code}` : `/don-hang/tra-cuu?ma=${code}`}
            className="border-ivory/30 hover:border-gold flex min-h-13.5 items-center border px-7 transition-colors"
          >
            {member ? "Xem đơn của tôi" : "Tra cứu đơn hàng"}
          </Link>
        </div>
      </section>

      <OrderDetails order={order} />
    </div>
  );
}
