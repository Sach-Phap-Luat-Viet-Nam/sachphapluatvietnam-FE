"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CircleCheck, RefreshCw, X } from "lucide-react";
import { isApiError } from "@slvn/api-client";
import { cn } from "@slvn/ui";
import { BookLoader } from "@/components/BookLoader";
import { FORM_ERROR, INPUT, LABEL } from "@/components/form-styles";
import { BankTransferInfo, isAwaitingTransfer } from "./BankTransferInfo";
import { orderingErrorMessage } from "./errors";
import { OrderDetails } from "./OrderDetails";
import { BANK_ACCOUNT } from "./payment";
import type { BankAccount } from "./payment";
import { OrdersSignInRequired } from "./OrdersSignInRequired";
import { useCancelOrder, useMyOrder } from "./useOrders";

const MAX_REASON_LENGTH = 1000;

interface CancelOrderProps {
  code: string;
  cancel: ReturnType<typeof useCancelOrder>;
  onCancelled: () => void;
}

/** Nút "Hủy đơn hàng" và hộp thoại xác nhận, có ô lý do không bắt buộc. */
function CancelOrder({ code, cancel, onCancelled }: CancelOrderProps) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    cancel.mutate(reason.trim() || null, {
      onSuccess: () => {
        dialog.current?.close();
        onCancelled();
      },
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          cancel.reset();
          dialog.current?.showModal();
        }}
        className="border-danger/60 text-danger hover:bg-danger/10 min-h-12 w-fit border px-6 transition-colors"
      >
        Hủy đơn hàng
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        className="modal bg-panel text-ivory border-danger/40 backdrop:bg-scrim/75 fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg border p-6 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)] sm:p-8"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <h2 id={`${id}-title`} className="font-editorial text-2xl leading-tight font-bold">
              Hủy đơn {code}?
            </h2>
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => dialog.current?.close()}
              className="hover:text-gold -m-2 p-2"
            >
              <X size={22} />
            </button>
          </div>
          <p className="text-sand leading-7">Đơn đã hủy không khôi phục được. Sách giữ cho đơn sẽ được trả lại kho.</p>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-reason`} className={LABEL}>
              Lý do hủy (không bắt buộc)
            </label>
            <textarea
              id={`${id}-reason`}
              rows={3}
              maxLength={MAX_REASON_LENGTH}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ví dụ: đặt nhầm sách"
              className={cn(INPUT, "border-border h-auto py-3")}
            />
          </div>
          {cancel.isError && (
            <p role="alert" className={FORM_ERROR}>
              {orderingErrorMessage(cancel.error)}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={cancel.isPending}
              className="bg-danger text-ink min-h-13.5 px-6 font-semibold disabled:opacity-60 sm:flex-1"
            >
              {cancel.isPending ? "Đang hủy…" : "Xác nhận hủy đơn"}
            </button>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="border-ivory/30 hover:border-gold min-h-13.5 border px-6 transition-colors sm:flex-1"
            >
              Giữ đơn
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export interface MyOrderProps {
  code: string;
  /** Mặc định lấy cấu hình trong `payment.ts`; truyền vào để test. */
  bankAccount?: BankAccount | null;
}

/** Chi tiết một đơn của thành viên: trạng thái, chuyển khoản (nếu chờ), chi tiết đơn, hủy đơn khi còn được. */
export function MyOrder({ code, bankAccount = BANK_ACCOUNT }: MyOrderProps) {
  const { session, data: order, error, isError, isFetching, refetch } = useMyOrder(code);
  const cancel = useCancelOrder(code);
  const content = useRef<HTMLDivElement>(null);
  const back = (
    <Link href="/don-hang" className="link-underline text-gold flex min-h-11 w-fit items-center gap-2 text-sm">
      <ArrowLeft size={16} /> Đơn của tôi
    </Link>
  );

  if (session.status === "anonymous") {
    return <OrdersSignInRequired next={`/don-hang/${encodeURIComponent(code)}`} />;
  }

  if (isError && isApiError(error) && error.code === "NOT_FOUND") {
    return (
      <div className="border-gold/25 flex min-h-80 flex-col items-center justify-center gap-4 border px-6 text-center">
        <h2 className="font-editorial text-3xl font-bold">Không tìm thấy đơn hàng</h2>
        <p className="text-mist max-w-md leading-7">
          Mã đơn không đúng, hoặc đơn được đặt bằng tài khoản khác hay khi chưa đăng nhập.
        </p>
        <div className="flex flex-wrap justify-center gap-x-6">
          {back}
          <Link href="/don-hang/tra-cuu" className="link-underline text-gold flex min-h-11 items-center text-sm">
            Tra cứu bằng mã đơn và số điện thoại
          </Link>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className={FORM_ERROR}>
          Chưa tải được đơn hàng. {orderingErrorMessage(error)}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="link-underline text-gold flex min-h-11 items-center gap-2"
        >
          <RefreshCw size={16} /> Thử lại
        </button>
      </div>
    );
  }

  if (!order) {
    return <BookLoader label="Đang tải đơn hàng" />;
  }

  return (
    <div ref={content} tabIndex={-1} className="flex flex-col gap-8 outline-none">
      {back}
      {cancel.isSuccess && (
        <p role="status" className="text-ok flex items-center gap-2">
          <CircleCheck size={18} /> Đã hủy đơn hàng.
        </p>
      )}
      {isAwaitingTransfer(order) && bankAccount && <BankTransferInfo order={order} bankAccount={bankAccount} />}
      <OrderDetails order={order} />
      <div className="border-gold/20 flex flex-col gap-3 border-t pt-6">
        {order.canCancel ? (
          <>
            <p className="text-mist text-sm">Bạn có thể tự hủy đơn khi đơn chưa được đóng gói.</p>
            {/* Hủy xong nút biến mất: đưa focus về khung đơn để bàn phím/trình đọc màn hình không bị lạc. */}
            <CancelOrder code={order.orderCode} cancel={cancel} onCancelled={() => content.current?.focus()} />
          </>
        ) : (
          order.status !== "cancelled" && (
            <p className="text-mist text-sm leading-6">
              Đơn đã thanh toán hoặc đã đóng gói nên không tự hủy được. Cần hỗ trợ, bạn vui lòng liên hệ CSKH kèm mã
              đơn.
            </p>
          )
        )}
      </div>
    </div>
  );
}
