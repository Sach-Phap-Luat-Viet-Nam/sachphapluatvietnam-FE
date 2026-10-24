"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { Button } from "@slvn/ui";
import { formatDateTime, formatPrice } from "@slvn/utils";
import { DateInput } from "@/components/DateInput";
import { Field, fieldA11y } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD, INPUT, SELECT } from "@/components/form-styles";
import { enumLabel } from "@/lib/enum-label";
import { EMPTY_ORDER_QUERY, ORDERS_PAGE_SIZE, fetchOrders, orderKeys } from "./api";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_METHOD_FILTERS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  orderStatusTone,
  paymentStatusTone,
} from "./labels";
import { activeFilterCount, toOrderQuery } from "./order-filters";
import { orderFilterFormSchema } from "./schemas";
import type { OrderFilterFormValues } from "./schemas";

const TH = "px-4 py-3 font-medium";
const EMPTY_FILTERS: OrderFilterFormValues = { status: "", paymentMethod: "", from: "", to: "", q: "" };

/** Danh sách đơn, mới nhất trước: lọc trạng thái, phương thức thanh toán, ngày đặt, mã đơn / số điện thoại. */
export function OrderList() {
  const [query, setQuery] = useState(EMPTY_ORDER_QUERY);
  const orders = useQuery({
    queryKey: orderKeys.list(query),
    queryFn: () => fetchOrders(query),
    placeholderData: keepPreviousData,
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrderFilterFormValues>({ resolver: zodResolver(orderFilterFormSchema), defaultValues: EMPTY_FILTERS });
  const filtered = activeFilterCount(query) > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Đơn hàng"
        description="Mở một đơn để xem chi tiết và chuyển trạng thái: xác nhận, đóng gói, giao hàng, hủy, hoàn tiền."
      />

      <form
        role="search"
        aria-label="Lọc đơn hàng"
        noValidate
        onSubmit={handleSubmit((values) => setQuery(toOrderQuery(values)))}
        className={`${CARD} grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3`}
      >
        <Field id="order-q" label="Mã đơn hoặc số điện thoại" hint="Nhập đúng và đủ." error={errors.q?.message}>
          <input
            {...register("q")}
            {...fieldA11y("order-q", errors.q?.message, true)}
            type="search"
            placeholder="SLVN2610230001"
            className={INPUT}
          />
        </Field>
        <Field id="order-status" label="Trạng thái">
          <select {...register("status")} id="order-status" className={SELECT}>
            <option value="">Tất cả</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="order-payment" label="Thanh toán">
          <select {...register("paymentMethod")} id="order-payment" className={SELECT}>
            <option value="">Tất cả</option>
            {PAYMENT_METHOD_FILTERS.map((method) => (
              <option key={method} value={method}>
                {PAYMENT_METHOD_LABELS[method]}
              </option>
            ))}
          </select>
        </Field>
        <Controller
          control={control}
          name="from"
          render={({ field, fieldState }) => (
            <Field id="order-from" label="Đặt từ ngày" error={fieldState.error?.message}>
              <DateInput
                id="order-from"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(fieldState.error)}
                describedBy={fieldState.error ? "order-from-error" : undefined}
              />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="to"
          render={({ field, fieldState }) => (
            <Field id="order-to" label="Đến ngày" error={fieldState.error?.message}>
              <DateInput
                id="order-to"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(fieldState.error)}
                describedBy={fieldState.error ? "order-to-error" : undefined}
              />
            </Field>
          )}
        />
        <div className="flex flex-wrap items-end gap-3">
          <Button type="submit" size="lg">
            <Search size={18} aria-hidden="true" /> Lọc
          </Button>
          {filtered && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                reset(EMPTY_FILTERS);
                setQuery(EMPTY_ORDER_QUERY);
              }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>
      </form>

      {orders.isError ? (
        <ErrorStatus error={orders.error} onRetry={() => void orders.refetch()} />
      ) : orders.isPending ? (
        <LoadingStatus />
      ) : orders.data.items.length === 0 ? (
        <p className={`${CARD} text-muted p-6`}>{filtered ? "Không có đơn hàng phù hợp." : "Chưa có đơn hàng nào."}</p>
      ) : (
        <>
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full min-w-3xl text-left">
              <caption className="sr-only">Danh sách đơn hàng</caption>
              <thead className="border-border text-muted border-b text-sm">
                <tr>
                  <th scope="col" className={TH}>
                    Mã đơn
                  </th>
                  <th scope="col" className={TH}>
                    Khách hàng
                  </th>
                  <th scope="col" className={TH}>
                    Trạng thái
                  </th>
                  <th scope="col" className={TH}>
                    Thanh toán
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Số cuốn
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Tổng tiền
                  </th>
                  <th scope="col" className={TH}>
                    Ngày đặt
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.data.items.map((order) => (
                  <tr key={order.orderCode} className="border-border border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/don-hang/${order.orderCode}`}
                        className="text-primary font-medium whitespace-nowrap hover:underline"
                      >
                        {order.orderCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {order.customerName}
                      <span className="text-muted block text-sm">{order.phone}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={orderStatusTone(order.status)}>
                        {enumLabel(ORDER_STATUS_LABELS, order.status)}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block">{enumLabel(PAYMENT_METHOD_LABELS, order.paymentMethod)}</span>
                      <StatusBadge tone={paymentStatusTone(order.paymentStatus)}>
                        {enumLabel(PAYMENT_STATUS_LABELS, order.paymentStatus)}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{order.itemCount}</td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums">
                      {formatPrice(order.total)}
                    </td>
                    <td className="text-muted px-4 py-3 text-sm whitespace-nowrap">
                      {formatDateTime(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={orders.data.meta.page}
            limit={orders.data.meta.limit || ORDERS_PAGE_SIZE}
            total={orders.data.meta.total}
            onPageChange={(page) => setQuery({ ...query, page })}
          />
        </>
      )}
    </div>
  );
}
