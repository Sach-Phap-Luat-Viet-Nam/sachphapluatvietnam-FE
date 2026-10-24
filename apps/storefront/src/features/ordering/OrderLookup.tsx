"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { fieldErrors } from "@slvn/auth";
import { cn } from "@slvn/ui";
import { FORM_ERROR, INPUT, LABEL, SUBMIT } from "@/components/form-styles";
import { lookupOrder } from "./api";
import { orderLookupSchema } from "./order-forms";
import type { OrderLookupInput, OrderLookupValues } from "./order-forms";
import { orderingErrorMessage } from "./errors";
import { OrderDetails } from "./OrderDetails";
import type { Order } from "./schemas";

const LOOKUP_FIELDS = ["orderCode", "phone"] as const;
const LOOKUP_MESSAGES = {
  NOT_FOUND: "Không tìm thấy đơn hàng. Bạn kiểm tra lại mã đơn và số điện thoại đã dùng khi đặt hàng.",
};

export interface OrderLookupProps {
  /** Mã đơn điền sẵn, lấy từ `?ma=` (link ở màn đặt hàng thành công). */
  defaultOrderCode?: string;
}

/** Tra cứu đơn bằng mã đơn + số điện thoại, dành cho cả khách vãng lai. */
export function OrderLookup({ defaultOrderCode = "" }: OrderLookupProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OrderLookupInput, unknown, OrderLookupValues>({
    resolver: zodResolver(orderLookupSchema),
    defaultValues: { orderCode: defaultOrderCode, phone: "" },
  });

  const onSubmit = async ({ orderCode, phone }: OrderLookupValues) => {
    setOrder(null);
    try {
      setOrder(await lookupOrder(orderCode, phone));
    } catch (error) {
      const invalidFields = fieldErrors(error, LOOKUP_FIELDS);
      invalidFields.forEach(({ field, message }) => setError(field, { message }));
      if (invalidFields.length === 0) {
        setError("root.server", { message: orderingErrorMessage(error, LOOKUP_MESSAGES) });
      }
    }
  };

  return (
    <div className="flex flex-col gap-12">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label="Tra cứu đơn hàng"
        className="border-gold/30 bg-panel grid gap-5 border px-6 py-7 sm:grid-cols-[1fr_1fr_auto] sm:items-start sm:px-8"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="orderCode" className={LABEL}>
            Mã đơn hàng
          </label>
          <input
            id="orderCode"
            placeholder="SLVN2610230001"
            autoCapitalize="characters"
            {...register("orderCode")}
            aria-invalid={Boolean(errors.orderCode)}
            aria-describedby={errors.orderCode ? "orderCode-error" : undefined}
            className={cn(INPUT, "border-border uppercase")}
          />
          {errors.orderCode && (
            <p id="orderCode-error" role="alert" className="text-danger text-sm">
              {errors.orderCode.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="lookupPhone" className={LABEL}>
            Số điện thoại đặt hàng
          </label>
          <input
            id="lookupPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            {...register("phone")}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "lookupPhone-error" : undefined}
            className={cn(INPUT, "border-border")}
          />
          {errors.phone && (
            <p id="lookupPhone-error" role="alert" className="text-danger text-sm">
              {errors.phone.message}
            </p>
          )}
        </div>
        <button type="submit" disabled={isSubmitting} className={cn(SUBMIT, "px-7 sm:mt-6.5")}>
          <Search size={18} />
          {isSubmitting ? "Đang tìm…" : "Tra cứu"}
        </button>
        {errors.root?.server && (
          <p role="alert" className={cn(FORM_ERROR, "sm:col-span-3")}>
            {errors.root.server.message}
          </p>
        )}
      </form>

      {order && (
        <section aria-labelledby="lookup-result" className="flex flex-col gap-6">
          <h2 id="lookup-result" className="font-editorial text-3xl font-bold">
            Đơn hàng <span className="text-gold-pale">{order.orderCode}</span>
          </h2>
          <OrderDetails order={order} />
          {order.canCancel && (
            <p className="text-mist border-gold/20 border-t pt-5 text-sm leading-6">
              Cần hủy đơn khi đơn chưa đóng gói, bạn vui lòng liên hệ CSKH kèm mã đơn hàng.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
