"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { cn } from "@slvn/ui";
import { formatDateTime, formatPrice } from "@slvn/utils";
import { PageHeader } from "@/components/PageHeader";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD } from "@/components/form-styles";
import { enumLabel } from "@/lib/enum-label";
import { modulesForRoles } from "@/lib/modules";
import { useSessionUser } from "@/lib/use-session-user";
import { fetchOrder, orderKeys } from "./api";
import {
  COVER_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  orderStatusTone,
  paymentStatusTone,
} from "./labels";
import { OrderStatusActions } from "./OrderStatusActions";
import type { AdminOrder } from "./schemas";

const NOT_FOUND = { NOT_FOUND: "Không tìm thấy đơn hàng này." };
const TH = "px-4 py-3 font-medium";

/** Chi tiết đơn cho nhân viên: xử lý trạng thái, khách, giao hàng, thanh toán, sách, tiền và dòng thời gian. */
export function OrderDetail({ orderCode }: { orderCode: string }) {
  const detail = useQuery({ queryKey: orderKeys.detail(orderCode), queryFn: () => fetchOrder(orderCode) });

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link href="/don-hang" className="text-primary flex min-h-11 w-fit items-center gap-2 hover:underline">
        <ArrowLeft size={18} aria-hidden="true" /> Danh sách đơn hàng
      </Link>
      {detail.isError ? (
        <ErrorStatus error={detail.error} onRetry={() => void detail.refetch()} overrides={NOT_FOUND} />
      ) : detail.isPending ? (
        <LoadingStatus />
      ) : (
        <OrderView detail={detail.data} />
      )}
    </div>
  );
}

function OrderView({ detail }: { detail: AdminOrder }) {
  const user = useSessionUser();
  const { order, userId, costOfGoods } = detail;
  const canSeeCustomers = user ? modulesForRoles(user.roles).some((module) => module.id === "customers") : false;
  const address = order.shippingAddress;

  return (
    <>
      <PageHeader
        title={`Đơn ${order.orderCode}`}
        description={`Đặt lúc ${formatDateTime(order.createdAt) ?? ""}`}
        actions={
          <>
            <StatusBadge tone={orderStatusTone(order.status)}>
              {enumLabel(ORDER_STATUS_LABELS, order.status)}
            </StatusBadge>
            <StatusBadge tone={paymentStatusTone(order.paymentStatus)}>
              {enumLabel(PAYMENT_STATUS_LABELS, order.paymentStatus)}
            </StatusBadge>
          </>
        }
      />

      <OrderStatusActions detail={detail} />

      <div className="grid gap-6 md:grid-cols-2">
        <InfoCard title="Khách hàng" titleId="order-customer">
          <Info label="Họ tên" value={order.customerName} />
          <Info label="Số điện thoại" value={order.phone} />
          <Info label="Email" value={order.email} />
          <Info
            label="Tài khoản"
            value={
              userId === null ? (
                "Khách vãng lai"
              ) : canSeeCustomers ? (
                <Link href={`/khach-hang/${userId}`} className="text-primary hover:underline">
                  Tài khoản #{userId}
                </Link>
              ) : (
                `Tài khoản #${userId}`
              )
            }
          />
        </InfoCard>

        <InfoCard title="Giao hàng" titleId="order-shipping">
          <Info label="Địa chỉ" value={`${address.streetAddress}, ${address.ward}, ${address.province}`} />
          <Info label="Ghi chú của khách" value={order.note} />
        </InfoCard>

        <InfoCard title="Thanh toán" titleId="order-payment">
          <Info label="Phương thức" value={enumLabel(PAYMENT_METHOD_LABELS, order.paymentMethod)} />
          <Info label="Tình trạng" value={enumLabel(PAYMENT_STATUS_LABELS, order.paymentStatus)} />
          {order.paymentExpiresAt && order.status === "pending_payment" && (
            <Info
              label="Hạn thanh toán"
              value={`${formatDateTime(order.paymentExpiresAt) ?? ""} (quá hạn hệ thống tự hủy đơn)`}
            />
          )}
        </InfoCard>

        <InfoCard title="Hóa đơn công ty" titleId="order-invoice">
          {order.invoiceInfo ? (
            <>
              <Info label="Tên công ty" value={order.invoiceInfo.companyName} />
              <Info label="Mã số thuế" value={order.invoiceInfo.taxCode} />
              <Info label="Địa chỉ" value={order.invoiceInfo.address} />
              <Info label="Email nhận hóa đơn" value={order.invoiceInfo.email} />
            </>
          ) : (
            <Info label="Yêu cầu" value="Khách không yêu cầu xuất hóa đơn." />
          )}
        </InfoCard>
      </div>

      <section aria-labelledby="order-items" className={`${CARD} flex flex-col`}>
        <h2 id="order-items" className="p-5 pb-3 text-xl font-semibold">
          Sách trong đơn
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-2xl text-left">
            <thead className="border-border text-muted border-y text-sm">
              <tr>
                <th scope="col" className={TH}>
                  Sách
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Đơn giá
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Số lượng
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Thành tiền
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.skuId} className="border-border border-b">
                  <td className="px-4 py-3">
                    <span className="font-medium">{item.bookTitle}</span>
                    <span className="text-muted block text-sm">
                      {[item.editionName, enumLabel(COVER_TYPE_LABELS, item.coverType), item.skuCode]
                        .filter(Boolean)
                        .join(" · ")}
                      {item.isbn ? ` · ISBN ${item.isbn}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatPrice(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatPrice(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Số tiền lấy nguyên từ backend, FE không tính lại. */}
        <dl className="flex flex-col items-end gap-1 p-5">
          <Amount label="Tạm tính" value={order.subtotal} />
          {order.discount > 0 && <Amount label="Giảm giá" value={-order.discount} />}
          <Amount label="Phí vận chuyển" value={order.shippingFee} />
          <Amount label="Tổng cộng" value={order.total} strong />
          {costOfGoods !== null && <Amount label="Giá vốn hàng xuất" value={costOfGoods} muted />}
        </dl>
      </section>

      <section aria-labelledby="order-history" className={`${CARD} flex flex-col gap-4 p-5`}>
        <h2 id="order-history" className="text-xl font-semibold">
          Lịch sử trạng thái
        </h2>
        <ol className="border-border ml-2 flex flex-col gap-4 border-l-2 pl-5">
          {order.history.map((entry, index) => (
            <li key={`${entry.createdAt}-${index}`} className="relative flex flex-col gap-0.5">
              <span
                aria-hidden="true"
                className="bg-primary border-background absolute top-1.5 -left-[1.6rem] size-3 rounded-full border-2"
              />
              <span className="font-medium">
                {entry.fromStatus ? `${enumLabel(ORDER_STATUS_LABELS, entry.fromStatus)} → ` : ""}
                {enumLabel(ORDER_STATUS_LABELS, entry.toStatus)}
              </span>
              <span className="text-muted text-sm">{formatDateTime(entry.createdAt)}</span>
              {entry.note && <span className="leading-7">{entry.note}</span>}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function InfoCard({ title, titleId, children }: { title: string; titleId: string; children: ReactNode }) {
  return (
    <section aria-labelledby={titleId} className={`${CARD} flex flex-col gap-4 p-5`}>
      <h2 id={titleId} className="text-xl font-semibold">
        {title}
      </h2>
      <dl className="flex flex-col gap-3">{children}</dl>
    </section>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted text-sm">{label}</dt>
      <dd className="break-words">{value ?? "—"}</dd>
    </div>
  );
}

function Amount({ label, value, strong, muted }: { label: string; value: number; strong?: boolean; muted?: boolean }) {
  return (
    <div
      className={cn(
        "flex w-full max-w-sm justify-between gap-6",
        strong && "text-lg font-semibold",
        muted && "text-muted",
      )}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatPrice(value)}</dd>
    </div>
  );
}
