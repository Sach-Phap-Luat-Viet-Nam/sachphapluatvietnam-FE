"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarDays, RefreshCw, Search, X } from "lucide-react";
import { Button, cn } from "@slvn/ui";
import { formatDateTime, formatPrice } from "@slvn/utils";
import { DateInput } from "@/components/DateInput";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD, FIELD_ERROR, INPUT, SELECT } from "@/components/form-styles";
import { enumLabel } from "@/lib/enum-label";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { ORDERS_PAGE_SIZE, fetchOrders, orderKeys } from "./api";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_METHOD_FILTERS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  orderStatusTone,
  paymentStatusTone,
} from "./labels";
import type { OrderStatus } from "./labels";
import { activeFilterCount, recentDaysRange, resolveOrderQuery } from "./order-filters";
import type { OrderFilterFormValues } from "./schemas";

const EMPTY_FILTERS: OrderFilterFormValues = { status: "", paymentMethod: "", from: "", to: "", q: "" };

/** Trạng thái hay lọc nhất theo quy trình xử lý đơn; các trạng thái còn lại ở ô chọn "Khác". */
const QUICK_STATUSES: readonly OrderStatus[] = [
  "pending_payment",
  "pending_confirm",
  "confirmed",
  "packing",
  "ready_to_ship",
  "shipping",
  "delivered",
  "completed",
  "cancelled",
];
const OTHER_STATUSES = ORDER_STATUSES.filter((status) => !QUICK_STATUSES.includes(status));

const DATE_PRESETS = [
  { label: "Hôm nay", days: 1 },
  { label: "7 ngày qua", days: 7 },
  { label: "30 ngày qua", days: 30 },
] as const;

/** Một hàng đơn: bảng ở màn rộng, thẻ ở điện thoại. */
const ROW_GRID =
  "md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_4.5rem_8rem] md:items-center md:gap-4";

/** Nút lọc dạng viên thuốc, bấm là áp ngay. */
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border text-foreground hover:border-primary hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Danh sách đơn, mới nhất trước. Bộ lọc tự áp khi chọn hoặc gõ (không cần bấm "Lọc"): ô tìm theo mã đơn / số điện thoại,
 * nhóm nút trạng thái, phương thức thanh toán và khoảng ngày đặt. Cả hàng đơn bấm được để mở chi tiết; danh sách tự làm
 * mới mỗi phút để thấy đơn mới.
 */
export function OrderList() {
  const [state, setState] = useState({ filters: EMPTY_FILTERS, page: 1 });
  const [showDates, setShowDates] = useState(false);
  const { filters, page } = state;
  // Gõ ở ô tìm thì chờ ngừng gõ mới gọi API; bấm nút lọc thì áp ngay.
  const debouncedQ = useDebouncedValue(filters.q, 400);
  const { query } = resolveOrderQuery({ ...filters, q: debouncedQ }, page);
  const inputErrors = resolveOrderQuery(filters, page).errors;
  const filtered = activeFilterCount(query) > 0 || filters.q !== "";

  const orders = useQuery({
    queryKey: orderKeys.list(query),
    queryFn: () => fetchOrders(query),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const change = (patch: Partial<OrderFilterFormValues>) =>
    setState((current) => ({ filters: { ...current.filters, ...patch }, page: 1 }));
  const reset = () => {
    setState({ filters: EMPTY_FILTERS, page: 1 });
    setShowDates(false);
  };
  const hasDates = filters.from !== "" || filters.to !== "";
  const datesOpen = showDates || hasDates;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Đơn hàng"
        description="Mở một đơn để xem chi tiết và chuyển trạng thái: xác nhận, đóng gói, giao hàng, hủy, hoàn tiền."
        actions={
          <Button
            variant="outline"
            onClick={() => void orders.refetch()}
            disabled={orders.isFetching}
            aria-label="Làm mới danh sách đơn"
          >
            <RefreshCw size={18} aria-hidden="true" className={orders.isFetching ? "animate-spin" : undefined} /> Làm
            mới
          </Button>
        }
      />

      <section aria-label="Lọc đơn hàng" className={`${CARD} flex flex-col gap-4 p-4 sm:p-5`}>
        <div role="search" className="flex flex-col gap-2">
          <label htmlFor="order-q" className="sr-only">
            Mã đơn hoặc số điện thoại
          </label>
          <div className="relative">
            <Search size={18} aria-hidden="true" className="text-muted absolute top-1/2 left-3.5 -translate-y-1/2" />
            <input
              id="order-q"
              type="search"
              value={filters.q}
              onChange={(event) => change({ q: event.target.value })}
              placeholder="Tìm theo mã đơn hoặc số điện thoại (nhập đúng và đủ), ví dụ SLVN2610230001"
              maxLength={60}
              aria-invalid={Boolean(inputErrors.q)}
              aria-describedby={inputErrors.q ? "order-q-error" : undefined}
              className={`${INPUT} pr-11 pl-10`}
            />
            {filters.q && (
              <button
                type="button"
                aria-label="Xóa nội dung tìm kiếm"
                onClick={() => change({ q: "" })}
                className="text-muted hover:text-foreground absolute top-1 right-1 flex size-10 items-center justify-center"
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
          {inputErrors.q && (
            <p id="order-q-error" role="alert" className={FIELD_ERROR}>
              {inputErrors.q}
            </p>
          )}
        </div>

        <div role="group" aria-label="Trạng thái" className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
          <Chip active={filters.status === ""} onClick={() => change({ status: "" })}>
            Tất cả
          </Chip>
          {QUICK_STATUSES.map((status) => (
            <Chip key={status} active={filters.status === status} onClick={() => change({ status })}>
              {ORDER_STATUS_LABELS[status]}
            </Chip>
          ))}
          <select
            aria-label="Trạng thái khác"
            value={OTHER_STATUSES.some((status) => status === filters.status) ? filters.status : ""}
            onChange={(event) => {
              const value = event.target.value;
              change({ status: OTHER_STATUSES.find((status) => status === value) ?? "" });
            }}
            className={cn(SELECT, "h-11 w-auto shrink-0 rounded-full text-sm")}
          >
            <option value="">Trạng thái khác</option>
            {OTHER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Thanh toán" className="flex flex-wrap items-center gap-2">
            <Chip active={filters.paymentMethod === ""} onClick={() => change({ paymentMethod: "" })}>
              Mọi hình thức
            </Chip>
            {PAYMENT_METHOD_FILTERS.map((method) => (
              <Chip
                key={method}
                active={filters.paymentMethod === method}
                onClick={() => change({ paymentMethod: method })}
              >
                {PAYMENT_METHOD_LABELS[method]}
              </Chip>
            ))}
          </div>
          <span aria-hidden="true" className="bg-border mx-1 hidden h-6 w-px sm:block" />
          <div role="group" aria-label="Ngày đặt" className="flex flex-wrap items-center gap-2">
            {DATE_PRESETS.map((preset) => {
              const range = recentDaysRange(preset.days);
              return (
                <Chip
                  key={preset.label}
                  active={filters.from === range.from && filters.to === range.to}
                  onClick={() => change(range)}
                >
                  {preset.label}
                </Chip>
              );
            })}
            <Chip active={datesOpen} onClick={() => setShowDates((open) => !open)}>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={16} aria-hidden="true" /> Chọn ngày
              </span>
            </Chip>
          </div>
          {filtered && (
            <Button variant="ghost" onClick={reset} className="ml-auto">
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {datesOpen && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="order-from" className="text-base font-medium">
                Đặt từ ngày
              </label>
              <DateInput
                id="order-from"
                value={filters.from}
                onChange={(from) => change({ from })}
                invalid={Boolean(inputErrors.from)}
                describedBy={inputErrors.from ? "order-from-error" : undefined}
              />
              {inputErrors.from && (
                <p id="order-from-error" role="alert" className={FIELD_ERROR}>
                  {inputErrors.from}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="order-to" className="text-base font-medium">
                Đến ngày
              </label>
              <DateInput
                id="order-to"
                value={filters.to}
                onChange={(to) => change({ to })}
                invalid={Boolean(inputErrors.to)}
                describedBy={inputErrors.to ? "order-to-error" : undefined}
              />
              {inputErrors.to && (
                <p id="order-to-error" role="alert" className={FIELD_ERROR}>
                  {inputErrors.to}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {orders.isError ? (
        <ErrorStatus error={orders.error} onRetry={() => void orders.refetch()} />
      ) : orders.isPending ? (
        <LoadingStatus />
      ) : orders.data.items.length === 0 ? (
        <p className={`${CARD} text-muted p-6`}>{filtered ? "Không có đơn hàng phù hợp." : "Chưa có đơn hàng nào."}</p>
      ) : (
        <>
          <p aria-live="polite" className="text-muted text-sm">
            {orders.data.meta.total} đơn hàng{filtered ? " phù hợp" : ""}
          </p>
          <div className={cn(CARD, "overflow-hidden", orders.isPlaceholderData && "opacity-60 transition-opacity")}>
            <div
              aria-hidden="true"
              className={cn(ROW_GRID, "border-border text-muted hidden border-b px-5 py-3 text-sm font-medium")}
            >
              <span>Mã đơn</span>
              <span>Khách hàng</span>
              <span>Trạng thái và thanh toán</span>
              <span className="text-right">Số cuốn</span>
              <span className="text-right">Tổng tiền</span>
            </div>
            <ul aria-label="Danh sách đơn hàng" className="divide-border divide-y">
              {orders.data.items.map((order) => (
                <li
                  key={order.orderCode}
                  className={cn(
                    ROW_GRID,
                    "hover:bg-surface focus-within:bg-surface relative flex flex-col gap-2 px-4 py-4 transition-colors sm:px-5",
                  )}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 md:block">
                    {/* Link phủ cả hàng (after:absolute) nên bấm đâu trên hàng cũng mở chi tiết. */}
                    <Link
                      href={`/don-hang/${order.orderCode}`}
                      className="text-primary font-semibold whitespace-nowrap after:absolute after:inset-0 hover:underline"
                    >
                      {order.orderCode}
                    </Link>
                    <span className="text-muted block text-sm whitespace-nowrap">
                      {formatDateTime(order.createdAt)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate font-medium">{order.customerName}</span>
                    <span className="text-muted block text-sm">{order.phone}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 md:flex-col md:items-start">
                    <StatusBadge tone={orderStatusTone(order.status)}>
                      {enumLabel(ORDER_STATUS_LABELS, order.status)}
                    </StatusBadge>
                    <span className="flex flex-wrap items-center gap-1.5 text-sm">
                      <span className="text-muted">{enumLabel(PAYMENT_METHOD_LABELS, order.paymentMethod)}</span>
                      <StatusBadge tone={paymentStatusTone(order.paymentStatus)}>
                        {enumLabel(PAYMENT_STATUS_LABELS, order.paymentStatus)}
                      </StatusBadge>
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 md:contents">
                    <span className="text-muted md:text-foreground text-sm tabular-nums md:text-right md:text-base">
                      <span className="md:sr-only">Số cuốn: </span>
                      {order.itemCount}
                      <span className="md:sr-only"> cuốn</span>
                    </span>
                    <span className="text-lg font-semibold whitespace-nowrap tabular-nums md:text-right md:text-base">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <Pagination
            page={orders.data.meta.page}
            limit={orders.data.meta.limit || ORDERS_PAGE_SIZE}
            total={orders.data.meta.total}
            onPageChange={(next) => setState((current) => ({ ...current, page: next }))}
          />
        </>
      )}
    </div>
  );
}
