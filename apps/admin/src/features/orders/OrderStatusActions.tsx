"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isApiError } from "@slvn/api-client";
import { Button } from "@slvn/ui";
import { Field, fieldA11y } from "@/components/Field";
import { CARD, FORM_ERROR, FORM_SUCCESS, HINT, TEXTAREA } from "@/components/form-styles";
import { adminErrorMessage } from "@/lib/admin-errors";
import { enumLabel } from "@/lib/enum-label";
import { canManageOrders } from "@/lib/roles";
import { useSessionUser } from "@/lib/use-session-user";
import { changeOrderStatus, orderKeys } from "./api";
import { ORDER_STATUS_LABELS, isDestructiveTransition, transitionEffect } from "./labels";
import { statusChangeFormSchema } from "./schemas";
import type { AdminOrder, StatusChangeFormValues } from "./schemas";

/**
 * Nút chuyển trạng thái dựng từ `nextStatuses` (danh sách duy nhất backend chấp nhận). Chọn trạng thái thì mở form ghi
 * chú và nút xác nhận; hủy đơn, hoàn tiền dùng nút đỏ. Vai trò chỉ xem (CSKH, Kế toán) không thấy nút.
 */
export function OrderStatusActions({ detail }: { detail: AdminOrder }) {
  const user = useSessionUser();
  const [target, setTarget] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { order, nextStatuses } = detail;

  if (!user) {
    return null;
  }
  if (!canManageOrders(user.roles)) {
    return (
      <p className={`${CARD} text-muted p-5 leading-7`}>
        Vai trò của anh/chị chỉ xem đơn. Đổi trạng thái do Quản lý đơn hoặc Super Admin thực hiện.
      </p>
    );
  }

  return (
    <section aria-labelledby="order-actions" className={`${CARD} flex flex-col gap-4 p-5`}>
      <h2 id="order-actions" className="text-xl font-semibold">
        Xử lý đơn
      </h2>
      {done && (
        <p role="status" className={FORM_SUCCESS}>
          {done}
        </p>
      )}
      {nextStatuses.length === 0 ? (
        <p className={HINT}>Đơn đã ở trạng thái cuối, không chuyển tiếp được.</p>
      ) : target ? (
        <StatusChangeForm
          orderCode={order.orderCode}
          status={target}
          effect={transitionEffect(target, order.paymentMethod)}
          onCancel={() => setTarget(null)}
          onChanged={(label) => {
            setTarget(null);
            setDone(`Đã chuyển đơn sang “${label}”.`);
          }}
        />
      ) : (
        <>
          <p className={HINT}>Chuyển đơn sang:</p>
          <div className="flex flex-wrap gap-3">
            {nextStatuses.map((status) => (
              <Button
                key={status}
                variant={isDestructiveTransition(status) ? "danger-outline" : "primary"}
                onClick={() => {
                  setDone(null);
                  setTarget(status);
                }}
              >
                {enumLabel(ORDER_STATUS_LABELS, status)}
              </Button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

interface StatusChangeFormProps {
  orderCode: string;
  status: string;
  effect: string | null;
  onCancel: () => void;
  onChanged: (label: string) => void;
}

function StatusChangeForm({ orderCode, status, effect, onCancel, onChanged }: StatusChangeFormProps) {
  const queryClient = useQueryClient();
  const label = enumLabel(ORDER_STATUS_LABELS, status);
  const destructive = isDestructiveTransition(status);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StatusChangeFormValues>({ resolver: zodResolver(statusChangeFormSchema), defaultValues: { note: "" } });
  const change = useMutation({
    mutationFn: ({ note }: StatusChangeFormValues) =>
      changeOrderStatus(orderCode, { status, note: note.trim() || null }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(orderKeys.detail(orderCode), updated);
      await queryClient.invalidateQueries({ queryKey: orderKeys.lists });
      onChanged(label);
    },
    onError: (error) => {
      // Người khác vừa đổi trạng thái: tải lại đơn để dựng lại nút theo `nextStatuses` mới.
      if (isApiError(error) && error.code === "ORDER_INVALID_TRANSITION") {
        void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderCode) });
      }
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => change.mutate(values))}
      noValidate
      aria-label={`Chuyển đơn ${orderCode} sang ${label}`}
      className="flex flex-col gap-4"
    >
      <p className="font-medium">
        Chuyển đơn {orderCode} sang “{label}”?
      </p>
      {effect && <p className={HINT}>{effect}</p>}
      <Field id="status-note" label="Ghi chú" optional error={errors.note?.message}>
        <textarea
          {...register("note")}
          {...fieldA11y("status-note", errors.note?.message)}
          rows={2}
          // Form mở ra ngay sau khi chọn trạng thái nên đưa focus vào ô ghi chú.
          autoFocus
          placeholder={destructive ? "Ví dụ: khách gọi hủy" : "Ví dụ: đã gọi xác nhận với khách"}
          className={TEXTAREA}
        />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant={destructive ? "danger" : "primary"} disabled={change.isPending}>
          {change.isPending ? "Đang lưu…" : `Xác nhận: ${label}`}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={change.isPending}>
          Quay lại
        </Button>
      </div>
      {change.isError && (
        <p role="alert" className={FORM_ERROR}>
          {adminErrorMessage(change.error)}
        </p>
      )}
    </form>
  );
}
