"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@slvn/ui";
import { formatDateTime, formatPrice } from "@slvn/utils";
import { FORM_ERROR, SUBMIT } from "@/components/form-styles";
import { orderingErrorMessage } from "./errors";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_SHORT_LABELS, label, orderStatusTone } from "./labels";
import { SignInRequired } from "./SignInRequired";
import { useMyOrders } from "./useOrders";

const TONE_CLASSES = {
  done: "border-ok/50 text-ok",
  waiting: "border-upcoming/60 text-upcoming",
  active: "border-gold/60 text-gold",
  closed: "border-ivory/25 text-mist",
} as const;

function pageHref(page: number): string {
  return page > 1 ? `/don-hang?page=${page}` : "/don-hang";
}

export interface MyOrdersProps {
  /** Trang hiện tại, lấy từ `?page=`. */
  page: number;
}

/** Danh sách đơn của thành viên đang đăng nhập, mới nhất trước, có phân trang. */
export function MyOrders({ page }: MyOrdersProps) {
  const { session, data, error, isError, isFetching, isPlaceholderData, refetch } = useMyOrders(page);

  if (session.status === "anonymous") {
    return <SignInRequired next={pageHref(page)} />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className={FORM_ERROR}>
          Chưa tải được danh sách đơn. {orderingErrorMessage(error)}
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

  if (!data) {
    return (
      <p role="status" className="text-gold py-16 text-xs tracking-[0.3em]">
        ĐANG TẢI ĐƠN HÀNG…
      </p>
    );
  }

  const { limit, total } = data.meta;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  if (!data.items.length) {
    return (
      <div className="border-gold/25 flex min-h-80 flex-col items-center justify-center gap-4 border px-6 text-center">
        {page > 1 ? (
          <>
            <h2 className="font-editorial text-3xl font-bold">Không có đơn ở trang này</h2>
            <Link href="/don-hang" className="link-underline text-gold">
              Về trang đầu
            </Link>
          </>
        ) : (
          <>
            <h2 className="font-editorial text-3xl font-bold">Bạn chưa có đơn hàng nào</h2>
            <p className="text-mist max-w-md leading-7">
              Đơn đặt khi chưa đăng nhập không hiện ở đây, bạn tra cứu bằng mã đơn và số điện thoại.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Link href="/sach" className={cn(SUBMIT, "px-7")}>
                Vào tủ sách <ArrowRight size={18} />
              </Link>
              <Link
                href="/don-hang/tra-cuu"
                className="border-ivory/30 hover:border-gold flex min-h-13.5 items-center border px-7 transition-colors"
              >
                Tra cứu đơn hàng
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-8", isPlaceholderData && "opacity-60")} aria-busy={isPlaceholderData}>
      <p className="text-mist text-sm">{total} đơn hàng</p>
      <ul className="border-gold/20 border-t">
        {data.items.map((order) => (
          <li key={order.orderCode} className="border-gold/20 border-b">
            <Link
              href={`/don-hang/${encodeURIComponent(order.orderCode)}`}
              className="group hover:bg-panel grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 px-2 py-5 transition-colors sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto] sm:px-4"
            >
              <span className="min-w-0">
                <span className="text-gold-pale font-editorial block text-xl font-semibold tracking-wide">
                  {order.orderCode}
                </span>
                <span className="text-mist mt-1 block text-sm">{formatDateTime(order.createdAt)}</span>
              </span>
              <span
                className={cn(
                  "w-fit border px-2.5 py-1 text-sm max-sm:col-start-1 max-sm:row-start-2",
                  TONE_CLASSES[orderStatusTone(order.status)],
                )}
              >
                {label(ORDER_STATUS_LABELS, order.status)}
              </span>
              <span className="text-right max-sm:col-start-2 max-sm:row-span-2 max-sm:row-start-1">
                <span className="block font-semibold">{formatPrice(order.total)}</span>
                <span className="text-mist block text-sm">
                  {order.itemCount} cuốn · {label(PAYMENT_METHOD_SHORT_LABELS, order.paymentMethod)}
                </span>
              </span>
              <ChevronRight
                size={20}
                aria-hidden="true"
                className="text-mist group-hover:text-gold hidden transition-colors sm:block"
              />
            </Link>
          </li>
        ))}
      </ul>

      {pageCount > 1 && (
        <nav aria-label="Phân trang đơn hàng" className="flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="link-underline text-gold flex min-h-11 items-center gap-2">
              <ArrowLeft size={17} /> Trang trước
            </Link>
          ) : (
            <span />
          )}
          <span className="text-mist text-sm">
            Trang {page}/{pageCount}
          </span>
          {page < pageCount ? (
            <Link href={pageHref(page + 1)} className="link-underline text-gold flex min-h-11 items-center gap-2">
              Trang sau <ArrowRight size={17} />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
