"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, Pencil, Trash2, X } from "lucide-react";
import { isApiError } from "@slvn/api-client";
import { Button, buttonClassName } from "@slvn/ui";
import { formatDate, formatDateTime, formatPrice } from "@slvn/utils";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { PageHeader } from "@/components/PageHeader";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD, FORM_ERROR, HINT, TEXTAREA } from "@/components/form-styles";
import { adminErrorMessage, showServerError } from "@/lib/admin-errors";
import { enumLabel } from "@/lib/enum-label";
import { canApproveReceipts, canModifyReceipt } from "@/lib/roles";
import { useSessionUser } from "@/lib/use-session-user";
import { approveReceipt, deleteReceipt, fetchReceipt, inventoryKeys, rejectReceipt } from "./api";
import { receiptTotals } from "./forms";
import { COVER_TYPE_LABELS, RECEIPT_STATUS_LABELS, receiptStatusTone } from "./labels";
import { rejectFormSchema } from "./schemas";
import type { Receipt, RejectFormValues } from "./schemas";

const NOT_FOUND = { NOT_FOUND: "Không tìm thấy phiếu nhập này." };
const TH = "px-4 py-3 font-medium";

/** Chi tiết phiếu nhập; Super Admin duyệt hoặc từ chối phiếu chờ duyệt, người lập sửa hoặc xóa phiếu nháp. */
export function ReceiptDetail({ receiptId }: { receiptId: number }) {
  const receipt = useQuery({ queryKey: inventoryKeys.receipt(receiptId), queryFn: () => fetchReceipt(receiptId) });

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link href="/kho" className="text-primary flex min-h-11 w-fit items-center gap-2 hover:underline">
        <ArrowLeft size={18} aria-hidden="true" /> Danh sách phiếu nhập
      </Link>
      {receipt.isError ? (
        <ErrorStatus error={receipt.error} onRetry={() => void receipt.refetch()} overrides={NOT_FOUND} />
      ) : receipt.isPending ? (
        <LoadingStatus />
      ) : (
        <ReceiptView receipt={receipt.data} />
      )}
    </div>
  );
}

function ReceiptView({ receipt }: { receipt: Receipt }) {
  const totals = receiptTotals(receipt.lines);
  return (
    <>
      <PageHeader
        title={`Phiếu nhập #${receipt.id}`}
        description={receipt.note ?? undefined}
        actions={
          <StatusBadge tone={receiptStatusTone(receipt.status)}>
            {enumLabel(RECEIPT_STATUS_LABELS, receipt.status)}
          </StatusBadge>
        }
      />

      {receipt.status === "draft" && <ReceiptDecision receipt={receipt} totalQuantity={totals.quantity} />}

      <section aria-labelledby="receipt-info" className={`${CARD} flex flex-col gap-4 p-5`}>
        <h2 id="receipt-info" className="text-xl font-semibold">
          Thông tin phiếu
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Info label="Người lập" value={receipt.createdByName ?? `Tài khoản #${receipt.createdBy}`} />
          <Info label="Ngày lập" value={formatDateTime(receipt.createdAt)} />
          {receipt.decidedBy !== null && (
            <Info
              label={receipt.status === "rejected" ? "Người từ chối" : "Người duyệt"}
              value={receipt.decidedByName ?? `Tài khoản #${receipt.decidedBy}`}
            />
          )}
          {receipt.decidedAt && (
            <Info
              label={receipt.status === "rejected" ? "Ngày từ chối" : "Ngày duyệt"}
              value={formatDateTime(receipt.decidedAt)}
            />
          )}
          {receipt.rejectReason && <Info label="Lý do từ chối" value={receipt.rejectReason} />}
        </dl>
      </section>

      <section aria-labelledby="receipt-lines" className={`${CARD} flex flex-col`}>
        <h2 id="receipt-lines" className="p-5 pb-3 text-xl font-semibold">
          Các lô nhập
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-left">
            <thead className="border-border text-muted border-y text-sm">
              <tr>
                <th scope="col" className={TH}>
                  SKU
                </th>
                <th scope="col" className={TH}>
                  Mã lô
                </th>
                <th scope="col" className={TH}>
                  Xưởng in
                </th>
                <th scope="col" className={TH}>
                  Ngày nhập
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Số lượng
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Giá vốn/cuốn
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Thành tiền
                </th>
              </tr>
            </thead>
            <tbody>
              {receipt.lines.map((line) => (
                <tr key={line.id} className="border-border border-b">
                  <td className="px-4 py-3">
                    <Link href={`/kho/the-kho/${line.skuId}`} className="text-primary font-medium hover:underline">
                      {line.bookTitle ?? line.skuCode}
                    </Link>
                    <span className="text-muted block text-sm">
                      {[
                        line.skuCode,
                        line.coverType ? (COVER_TYPE_LABELS[line.coverType] ?? line.coverType) : null,
                        line.editionName,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">{line.batchCode}</td>
                  <td className="text-muted px-4 py-3">{line.printerName ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(line.receivedAt)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{line.quantity.toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatPrice(line.unitCost)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                    {formatPrice(line.quantity * line.unitCost)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <th scope="row" colSpan={4} className="px-4 py-3 text-right">
                  Tổng
                </th>
                <td className="px-4 py-3 text-right tabular-nums">{totals.quantity.toLocaleString("vi-VN")}</td>
                <td />
                <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatPrice(totals.cost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </>
  );
}

function ReceiptDecision({ receipt, totalQuantity }: { receipt: Receipt; totalQuantity: number }) {
  const user = useSessionUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(false);

  const refreshLists = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: inventoryKeys.receiptLists }),
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStockLists }),
      queryClient.invalidateQueries({ queryKey: ["inventory", "stock-card"] }),
    ]);
  const onDecided = async (updated: Receipt) => {
    queryClient.setQueryData(inventoryKeys.receipt(updated.id), updated);
    await refreshLists();
  };
  const onDecisionError = (error: unknown) => {
    // Phiếu đã được người khác duyệt/từ chối/xóa: tải lại để hiện trạng thái mới.
    if (isApiError(error) && (error.code === "RECEIPT_NOT_DRAFT" || error.code === "NOT_FOUND")) {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.receipt(receipt.id) });
    }
  };
  const approve = useMutation({
    mutationFn: () => approveReceipt(receipt.id),
    onSuccess: onDecided,
    onError: onDecisionError,
  });
  const remove = useMutation({
    mutationFn: () => deleteReceipt(receipt.id),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: inventoryKeys.receipt(receipt.id) });
      await refreshLists();
      router.push("/kho");
    },
    onError: onDecisionError,
  });

  if (!user) {
    return null;
  }
  const canModify = canModifyReceipt(user, receipt.createdBy);
  const modifyActions = canModify && (
    <>
      <Link
        href={`/kho/phieu-nhap/${receipt.id}/sua`}
        className={buttonClassName({ variant: "outline", size: "sm" })}
        aria-disabled={remove.isPending}
      >
        <Pencil size={16} aria-hidden="true" /> Sửa phiếu
      </Link>
      <ConfirmButton
        variant="danger-outline"
        question={`Xóa phiếu nháp #${receipt.id}? Không hoàn tác được.`}
        confirmLabel="Xóa phiếu"
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      >
        <Trash2 size={16} aria-hidden="true" /> {remove.isPending ? "Đang xóa…" : "Xóa phiếu"}
      </ConfirmButton>
    </>
  );
  const removeError = remove.isError && (
    <p role="alert" className={FORM_ERROR}>
      {adminErrorMessage(remove.error)}
    </p>
  );

  if (!canApproveReceipts(user.roles)) {
    return (
      <section aria-label="Phiếu đang chờ duyệt" className={`${CARD} flex flex-col gap-4 p-5`}>
        <p className="text-muted leading-7">
          Phiếu đang chờ Super Admin duyệt. Tồn kho chưa thay đổi cho tới khi phiếu được duyệt.
        </p>
        {canModify && <div className="flex flex-wrap items-center gap-3">{modifyActions}</div>}
        {removeError}
      </section>
    );
  }

  return (
    <section aria-labelledby="receipt-decision" className={`${CARD} flex flex-col gap-4 p-5`}>
      <h2 id="receipt-decision" className="text-xl font-semibold">
        Duyệt phiếu
      </h2>
      <p className={HINT}>
        Duyệt thì tạo lô in và cộng {totalQuantity.toLocaleString("vi-VN")} cuốn vào tồn khả dụng. Không hoàn tác được.
      </p>
      {!rejecting && (
        <div className="flex flex-wrap items-center gap-3">
          <ConfirmButton
            variant="primary"
            confirmVariant="primary"
            question={`Duyệt phiếu #${receipt.id} và nhập kho?`}
            confirmLabel="Duyệt"
            pending={approve.isPending}
            onConfirm={() => approve.mutate()}
          >
            <Check size={16} aria-hidden="true" /> {approve.isPending ? "Đang duyệt…" : "Duyệt và nhập kho"}
          </ConfirmButton>
          <Button variant="danger-outline" size="sm" disabled={approve.isPending} onClick={() => setRejecting(true)}>
            <X size={16} aria-hidden="true" /> Từ chối
          </Button>
          {modifyActions}
        </div>
      )}
      {approve.isError && (
        <p role="alert" className={FORM_ERROR}>
          {adminErrorMessage(approve.error)}
        </p>
      )}
      {removeError}
      {rejecting && (
        <RejectForm
          receiptId={receipt.id}
          onCancel={() => setRejecting(false)}
          onRejected={onDecided}
          onError={onDecisionError}
        />
      )}
    </section>
  );
}

interface RejectFormProps {
  receiptId: number;
  onCancel: () => void;
  onRejected: (receipt: Receipt) => Promise<void>;
  onError: (error: unknown) => void;
}

function RejectForm({ receiptId, onCancel, onRejected, onError }: RejectFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RejectFormValues>({ resolver: zodResolver(rejectFormSchema), defaultValues: { reason: "" } });

  const onSubmit = async ({ reason }: RejectFormValues) => {
    try {
      await onRejected(await rejectReceipt(receiptId, reason.trim()));
    } catch (error) {
      onError(error);
      showServerError(error, ["reason"], setError);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label={`Từ chối phiếu #${receiptId}`}
      className="flex flex-col gap-4"
    >
      <Field id="reject-reason" label="Lý do từ chối" error={errors.reason?.message}>
        <textarea
          {...register("reason")}
          {...fieldA11y("reject-reason", errors.reason?.message)}
          rows={3}
          // Form mở ra ngay sau khi bấm "Từ chối" nên đưa focus vào ô lý do.
          autoFocus
          className={TEXTAREA}
        />
      </Field>
      <FormActions
        pending={isSubmitting}
        submitLabel="Từ chối phiếu"
        onCancel={onCancel}
        error={errors.root?.server?.message}
      />
    </form>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted text-sm">{label}</dt>
      <dd>{value ?? "—"}</dd>
    </div>
  );
}
