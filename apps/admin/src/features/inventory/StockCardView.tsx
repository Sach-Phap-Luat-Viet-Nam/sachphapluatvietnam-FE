"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { cn } from "@slvn/ui";
import { formatDate, formatDateTime, formatPrice } from "@slvn/utils";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { PageHeader } from "@/components/PageHeader";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD, FORM_SUCCESS, INPUT, SELECT, TEXTAREA } from "@/components/form-styles";
import { showServerError } from "@/lib/admin-errors";
import { enumLabel } from "@/lib/enum-label";
import { modulesForRoles } from "@/lib/modules";
import { useSessionUser } from "@/lib/use-session-user";
import { fetchStockCard, inventoryKeys, issueStock, setLowStockThreshold } from "./api";
import { toIssueBody, toThresholdBody } from "./forms";
import { ISSUE_TYPE_LABELS, ISSUE_TYPES, TRANSACTION_TYPE_LABELS } from "./labels";
import { issueFormSchema, thresholdFormSchema } from "./schemas";
import type { IssueFormValues, StockCard, ThresholdFormValues } from "./schemas";
import { batchLabel, isLowStock, referenceHref } from "./stock-card";

const NOT_FOUND = { NOT_FOUND: "Không tìm thấy SKU này." };
const TH = "px-4 py-3 font-medium";

/** Thẻ kho của một SKU: tồn, lô in (thứ tự xuất FIFO), lịch sử nhập xuất, đặt ngưỡng và xuất thủ công. */
export function StockCardView({ skuId }: { skuId: number }) {
  const card = useQuery({ queryKey: inventoryKeys.stockCard(skuId), queryFn: () => fetchStockCard(skuId) });

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link href="/kho/the-kho" className="text-primary flex min-h-11 w-fit items-center gap-2 hover:underline">
        <ArrowLeft size={18} aria-hidden="true" /> Chọn SKU khác
      </Link>
      {card.isError ? (
        <ErrorStatus error={card.error} onRetry={() => void card.refetch()} overrides={NOT_FOUND} />
      ) : card.isPending ? (
        <LoadingStatus />
      ) : (
        <StockCardContent card={card.data} />
      )}
    </div>
  );
}

function StockCardContent({ card }: { card: StockCard }) {
  const user = useSessionUser();
  const canSeeOrders = user ? modulesForRoles(user.roles).some((module) => module.id === "orders") : false;

  return (
    <>
      <PageHeader
        title={`Thẻ kho ${card.skuCode}`}
        actions={isLowStock(card) ? <StatusBadge tone="warning">Tồn thấp</StatusBadge> : undefined}
      />

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Khả dụng (bán được)" value={card.available} emphasis />
        <Stat label="Đang giữ cho đơn" value={card.reserved} />
        <Stat label="Thực có trong kho" value={card.onHand} />
        <Stat label="Ngưỡng tồn thấp" value={card.lowStockThreshold} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <ThresholdForm card={card} />
        <IssueForm card={card} />
      </div>

      <section aria-labelledby="stock-batches" className={`${CARD} flex flex-col`}>
        <h2 id="stock-batches" className="p-5 pb-1 text-xl font-semibold">
          Lô in
        </h2>
        <p className="text-muted px-5 pb-3 text-sm">Theo thứ tự xuất kho: lô nhập trước xuất trước.</p>
        {card.batches.length === 0 ? (
          <p className="text-muted border-border border-t p-5">SKU này chưa có lô nào được nhập kho.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-2xl text-left">
              <thead className="border-border text-muted border-y text-sm">
                <tr>
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
                    Đã nhập
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Còn lại
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Giá vốn/cuốn
                  </th>
                </tr>
              </thead>
              <tbody>
                {card.batches.map((batch) => (
                  <tr
                    key={batch.id}
                    className={cn("border-border border-b last:border-b-0", batch.remaining === 0 && "text-muted")}
                  >
                    <td className="px-4 py-3 font-medium">{batch.batchCode}</td>
                    <td className="px-4 py-3">{batch.printerName ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(batch.receivedAt)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{batch.quantity.toLocaleString("vi-VN")}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{batch.remaining.toLocaleString("vi-VN")}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {formatPrice(batch.unitCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="stock-transactions" className={`${CARD} flex flex-col`}>
        <h2 id="stock-transactions" className="p-5 pb-1 text-xl font-semibold">
          Lịch sử nhập xuất
        </h2>
        <p className="text-muted px-5 pb-3 text-sm">
          100 dòng gần nhất, mới nhất trước. Số dương là nhập, số âm là xuất.
        </p>
        {card.recentTransactions.length === 0 ? (
          <p className="text-muted border-border border-t p-5">Chưa có giao dịch nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-3xl text-left">
              <thead className="border-border text-muted border-y text-sm">
                <tr>
                  <th scope="col" className={TH}>
                    Thời gian
                  </th>
                  <th scope="col" className={TH}>
                    Loại
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Số lượng
                  </th>
                  <th scope="col" className={TH}>
                    Lô
                  </th>
                  <th scope="col" className={TH}>
                    Chứng từ
                  </th>
                  <th scope="col" className={TH}>
                    Ghi chú
                  </th>
                </tr>
              </thead>
              <tbody>
                {card.recentTransactions.map((transaction) => {
                  const href = referenceHref(transaction.reference, canSeeOrders);
                  return (
                    <tr key={transaction.id} className="border-border border-b last:border-b-0">
                      <td className="text-muted px-4 py-3 text-sm whitespace-nowrap">
                        {formatDateTime(transaction.createdAt)}
                      </td>
                      <td className="px-4 py-3">{enumLabel(TRANSACTION_TYPE_LABELS, transaction.type)}</td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-medium tabular-nums",
                          transaction.quantity > 0 ? "text-success" : "text-danger",
                        )}
                      >
                        {transaction.quantity > 0 ? "+" : ""}
                        {transaction.quantity.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3">{batchLabel(card.batches, transaction.printBatchId) ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {href ? (
                          <Link href={href} className="text-primary hover:underline">
                            {transaction.reference}
                          </Link>
                        ) : (
                          (transaction.reference ?? "—")
                        )}
                      </td>
                      <td className="text-muted px-4 py-3">{transaction.note ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Stat({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className={`${CARD} flex flex-col gap-1 p-4`}>
      <dt className="text-muted text-sm">{label}</dt>
      <dd className={cn("text-2xl font-semibold tabular-nums", emphasis && "text-primary")}>
        {value.toLocaleString("vi-VN")}
      </dd>
    </div>
  );
}

/** Sau khi ghi: thay thẻ kho bằng response và làm mới danh sách tồn thấp. */
function useStockCardUpdate() {
  const queryClient = useQueryClient();
  return async (updated: StockCard) => {
    queryClient.setQueryData(inventoryKeys.stockCard(updated.skuId), updated);
    await queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStockLists });
  };
}

function ThresholdForm({ card }: { card: StockCard }) {
  const onUpdated = useStockCardUpdate();
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ThresholdFormValues>({
    resolver: zodResolver(thresholdFormSchema),
    defaultValues: { lowStockThreshold: String(card.lowStockThreshold) },
  });
  const save = useMutation({
    mutationFn: (values: ThresholdFormValues) => setLowStockThreshold(card.skuId, toThresholdBody(values)),
    onSuccess: onUpdated,
  });

  const onSubmit = async (values: ThresholdFormValues) => {
    setSaved(false);
    try {
      await save.mutateAsync(values);
      setSaved(true);
    } catch (error) {
      showServerError(error, ["lowStockThreshold"], setError);
    }
  };

  return (
    <section aria-labelledby="threshold-title" className={`${CARD} flex flex-col gap-4 p-5`}>
      <h2 id="threshold-title" className="text-xl font-semibold">
        Ngưỡng tồn thấp
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Field
          id="threshold"
          label="Cảnh báo khi tồn khả dụng còn (cuốn)"
          hint="Từ 0 đến 100.000. SKU chạm ngưỡng sẽ hiện ở tab Tồn thấp."
          error={errors.lowStockThreshold?.message}
        >
          <input
            {...register("lowStockThreshold")}
            {...fieldA11y("threshold", errors.lowStockThreshold?.message, true)}
            inputMode="numeric"
            className={`${INPUT} tabular-nums`}
          />
        </Field>
        <FormActions pending={isSubmitting} submitLabel="Lưu ngưỡng" error={errors.root?.server?.message} />
        {saved && (
          <p role="status" className={FORM_SUCCESS}>
            Đã lưu ngưỡng tồn thấp.
          </p>
        )}
      </form>
    </section>
  );
}

function IssueForm({ card }: { card: StockCard }) {
  const onUpdated = useStockCardUpdate();
  const [issued, setIssued] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: { type: "damage", quantity: "", note: "" },
  });
  const issue = useMutation({
    mutationFn: (values: IssueFormValues) => issueStock(toIssueBody(card.skuId, values)),
    onSuccess: onUpdated,
  });

  const onSubmit = async (values: IssueFormValues) => {
    setIssued(null);
    try {
      await issue.mutateAsync(values);
      setIssued(`Đã xuất ${Number(values.quantity).toLocaleString("vi-VN")} cuốn (${ISSUE_TYPE_LABELS[values.type]}).`);
      reset({ type: values.type, quantity: "", note: "" });
    } catch (error) {
      showServerError(error, ["type", "quantity", "note"], setError);
    }
  };

  return (
    <section aria-labelledby="issue-title" className={`${CARD} flex flex-col gap-4 p-5`}>
      <h2 id="issue-title" className="text-xl font-semibold">
        Xuất thủ công
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="issue-type" label="Loại xuất" error={errors.type?.message}>
            <select {...register("type")} {...fieldA11y("issue-type", errors.type?.message)} className={SELECT}>
              {ISSUE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ISSUE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="issue-quantity"
            label="Số lượng (cuốn)"
            hint={`Tối đa ${card.available.toLocaleString("vi-VN")} (tồn khả dụng).`}
            error={errors.quantity?.message}
          >
            <input
              {...register("quantity")}
              {...fieldA11y("issue-quantity", errors.quantity?.message, true)}
              inputMode="numeric"
              className={`${INPUT} tabular-nums`}
            />
          </Field>
        </div>
        <Field id="issue-note" label="Lý do" error={errors.note?.message}>
          <textarea
            {...register("note")}
            {...fieldA11y("issue-note", errors.note?.message)}
            rows={2}
            placeholder="Ví dụ: bìa rách khi vận chuyển"
            className={TEXTAREA}
          />
        </Field>
        <p className="text-muted text-sm leading-6">Xuất theo lô cũ nhất trước. Không hoàn tác được.</p>
        <FormActions pending={isSubmitting} submitLabel="Xuất kho" error={errors.root?.server?.message} />
        {issued && (
          <p role="status" className={FORM_SUCCESS}>
            {issued}
          </p>
        )}
      </form>
    </section>
  );
}
