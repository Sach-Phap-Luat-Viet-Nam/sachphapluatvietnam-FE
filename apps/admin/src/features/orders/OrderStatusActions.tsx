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

/** Trạng thái đích và các bước sẽ đi qua (một phần tử khi chuyển một bước). */
interface StatusTarget {
  status: string;
  steps: string[];
}

/**
 * Nút chuyển trạng thái dựng từ `nextStatuses` (bước kế tiếp) và `fastForward` (chuyển nhanh nhiều bước), đều là danh
 * sách backend chấp nhận. Chọn trạng thái thì mở form ghi chú và nút xác nhận, chuyển nhanh thì liệt kê các bước sẽ đi
 * qua; hủy đơn, hoàn tiền dùng nút đỏ. Vai trò chỉ xem (CSKH, Kế toán) không thấy nút.
 */
export function OrderStatusActions({ detail }: { detail: AdminOrder }) {
  const user = useSessionUser();
  const [target, setTarget] = useState<StatusTarget | null>(null);
  // Thông báo nằm ở khung ngoài để còn hiện sau khi đơn tải lại (form có thể biến mất nếu hết trạng thái kế tiếp).
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const { order, nextStatuses, fastForward } = detail;

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
      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={notice.kind === "error" ? FORM_ERROR : FORM_SUCCESS}
        >
          {notice.text}
        </p>
      )}
      {nextStatuses.length === 0 ? (
        <p className={HINT}>Đơn đã ở trạng thái cuối, không chuyển tiếp được.</p>
      ) : target ? (
        <StatusChangeForm
          orderCode={order.orderCode}
          status={target.status}
          steps={target.steps}
          effects={target.steps.flatMap((step) => transitionEffect(step, order.paymentMethod) ?? [])}
          onCancel={() => setTarget(null)}
          onChanged={(label) => {
            setTarget(null);
            setNotice({
              kind: "success",
              text:
                target.steps.length > 1
                  ? `Đã chuyển nhanh đơn sang “${label}” (${target.steps.length} bước).`
                  : `Đã chuyển đơn sang “${label}”.`,
            });
          }}
          onConflict={(text) => {
            setTarget(null);
            setNotice({ kind: "error", text });
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
                  setNotice(null);
                  setTarget({ status, steps: [status] });
                }}
              >
                {enumLabel(ORDER_STATUS_LABELS, status)}
              </Button>
            ))}
          </div>
          {fastForward.length > 0 && (
            <div role="group" aria-labelledby="order-fast-forward" className="flex flex-col gap-3">
              <p id="order-fast-forward" className={HINT}>
                Hoặc chuyển nhanh tới (đi qua các bước ở giữa, sẽ hỏi xác nhận):
              </p>
              <div className="flex flex-wrap gap-3">
                {fastForward.map((option) => (
                  <Button
                    key={option.status}
                    variant="outline"
                    onClick={() => {
                      setNotice(null);
                      setTarget(option);
                    }}
                  >
                    {enumLabel(ORDER_STATUS_LABELS, option.status)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

interface StatusChangeFormProps {
  orderCode: string;
  status: string;
  /** Các bước sẽ đi qua, phần tử cuối là `status`; nhiều hơn một là chuyển nhanh. */
  steps: string[];
  /** Tác động kèm theo của các bước (trừ kho, ghi nhận thu tiền...). */
  effects: string[];
  onCancel: () => void;
  onChanged: (label: string) => void;
  /** Đơn vừa được đổi ở nơi khác: đóng form, báo lỗi ở khung ngoài và tải lại đơn. */
  onConflict: (message: string) => void;
}

function StatusChangeForm({
  orderCode,
  status,
  steps,
  effects,
  onCancel,
  onChanged,
  onConflict,
}: StatusChangeFormProps) {
  const queryClient = useQueryClient();
  const label = enumLabel(ORDER_STATUS_LABELS, status);
  const fastForward = steps.length > 1;
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
        onConflict(adminErrorMessage(error));
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
      {fastForward ? (
        <>
          <p className="font-medium">
            Chuyển nhanh đơn {orderCode} sang “{label}”?
          </p>
          <p className={HINT}>
            Đơn sẽ đi qua {steps.length} bước: {steps.map((step) => enumLabel(ORDER_STATUS_LABELS, step)).join(" → ")}.
          </p>
        </>
      ) : (
        <p className="font-medium">
          Chuyển đơn {orderCode} sang “{label}”?
        </p>
      )}
      {effects.length > 0 && (
        <ul className={`${HINT} flex list-disc flex-col gap-1 pl-5`}>
          {effects.map((effect) => (
            <li key={effect}>{effect}</li>
          ))}
        </ul>
      )}
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
          {change.isPending ? "Đang lưu…" : fastForward ? `Xác nhận chuyển nhanh: ${label}` : `Xác nhận: ${label}`}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={change.isPending}>
          Quay lại
        </Button>
      </div>
      {change.isError && !(isApiError(change.error) && change.error.code === "ORDER_INVALID_TRANSITION") && (
        <p role="alert" className={FORM_ERROR}>
          {adminErrorMessage(change.error)}
        </p>
      )}
    </form>
  );
}
