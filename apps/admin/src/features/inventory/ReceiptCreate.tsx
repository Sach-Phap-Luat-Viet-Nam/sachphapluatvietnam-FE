"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { isApiError } from "@slvn/api-client";
import { Button } from "@slvn/ui";
import { formatPrice, vnDateKey } from "@slvn/utils";
import { DateInput } from "@/components/DateInput";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { PageHeader } from "@/components/PageHeader";
import { CARD, FIELD_ERROR, INPUT, TEXTAREA } from "@/components/form-styles";
import { adminErrorMessage } from "@/lib/admin-errors";
import { createReceipt, inventoryKeys } from "./api";
import { emptyReceiptLine, receiptFieldErrors, receiptTotals, toReceiptBody } from "./forms";
import { receiptFormSchema } from "./schemas";
import type { ReceiptFormValues } from "./schemas";
import { SkuPicker } from "./SkuPicker";

const ERROR_OVERRIDES = { REFERENCE_NOT_FOUND: "Có SKU không còn tồn tại. Anh/chị chọn lại SKU ở các dòng." };

/** Lập phiếu nhập nháp nhiều dòng (mỗi dòng là một lô in); lưu xong mở màn chi tiết phiếu. */
export function ReceiptCreate() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Ngày nhập mặc định là hôm nay theo giờ Việt Nam; tính một lần để thêm dòng mới dùng cùng ngày.
  const [today] = useState(() => vnDateKey(new Date()));
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptFormSchema),
    defaultValues: { note: "", lines: [emptyReceiptLine(today)] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const create = useMutation({
    mutationFn: createReceipt,
    onSuccess: async (receipt) => {
      queryClient.setQueryData(inventoryKeys.receipt(receipt.id), receipt);
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.receiptLists });
      router.push(`/kho/phieu-nhap/${receipt.id}`);
    },
  });

  const onSubmit = async (values: ReceiptFormValues) => {
    try {
      await create.mutateAsync(toReceiptBody(values));
    } catch (error) {
      const invalid = isApiError(error) ? receiptFieldErrors(error.errors) : [];
      invalid.forEach(({ path, message }) => setError(path, { message }));
      if (invalid.length === 0) {
        setError("root.server", { message: adminErrorMessage(error, ERROR_OVERRIDES) });
      }
    }
  };

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link href="/kho" className="text-primary flex min-h-11 w-fit items-center gap-2 hover:underline">
        <ArrowLeft size={18} aria-hidden="true" /> Danh sách phiếu nhập
      </Link>
      <PageHeader
        title="Lập phiếu nhập kho"
        description="Mỗi dòng là một lô in của một SKU. Phiếu lưu ở trạng thái “Chờ duyệt”; tồn kho chỉ tăng khi Super Admin duyệt."
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <ol className="flex flex-col gap-4">
          {fields.map((field, index) => (
            <ReceiptLineFields
              key={field.id}
              index={index}
              control={control}
              register={register}
              errors={errors}
              onRemove={fields.length > 1 ? () => remove(index) : undefined}
            />
          ))}
        </ol>
        {errors.lines?.root?.message && (
          <p role="alert" className={FIELD_ERROR}>
            {errors.lines.root.message}
          </p>
        )}
        <Button variant="outline" onClick={() => append(emptyReceiptLine(today))} className="w-fit">
          <Plus size={18} aria-hidden="true" /> Thêm dòng
        </Button>

        <Field id="receipt-note" label="Ghi chú" optional error={errors.note?.message}>
          <textarea
            {...register("note")}
            {...fieldA11y("receipt-note", errors.note?.message)}
            rows={3}
            className={TEXTAREA}
          />
        </Field>

        <ReceiptFormTotals control={control} />
        <FormActions
          pending={isSubmitting}
          submitLabel="Lưu phiếu nhập"
          onCancel={() => router.push("/kho")}
          error={errors.root?.server?.message}
        />
      </form>
    </div>
  );
}

interface ReceiptLineFieldsProps {
  index: number;
  control: Control<ReceiptFormValues>;
  register: UseFormRegister<ReceiptFormValues>;
  errors: FieldErrors<ReceiptFormValues>;
  onRemove?: () => void;
}

function ReceiptLineFields({ index, control, register, errors, onRemove }: ReceiptLineFieldsProps) {
  const lineErrors = errors.lines?.[index];
  const prefix = `line-${index}`;
  return (
    <li className={`${CARD} flex flex-col gap-4 p-5`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Dòng {index + 1}</h2>
        {onRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Xóa dòng ${index + 1}`}>
            <Trash2 size={16} aria-hidden="true" /> Xóa dòng
          </Button>
        )}
      </div>
      <Controller
        control={control}
        name={`lines.${index}.sku`}
        render={({ field }) => (
          <Field id={`${prefix}-sku`} label="SKU" error={lineErrors?.sku?.message}>
            <SkuPicker
              id={`${prefix}-sku`}
              value={field.value}
              onChange={field.onChange}
              invalid={Boolean(lineErrors?.sku)}
              describedBy={lineErrors?.sku ? `${prefix}-sku-error` : undefined}
            />
          </Field>
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`${prefix}-batch`}
          label="Mã lô"
          hint="Ví dụ LO-2026-10. Tự đổi sang chữ hoa."
          error={lineErrors?.batchCode?.message}
        >
          <input
            {...register(`lines.${index}.batchCode`)}
            {...fieldA11y(`${prefix}-batch`, lineErrors?.batchCode?.message, true)}
            autoComplete="off"
            className={`${INPUT} uppercase`}
          />
        </Field>
        <Field id={`${prefix}-printer`} label="Xưởng in" optional error={lineErrors?.printerName?.message}>
          <input
            {...register(`lines.${index}.printerName`)}
            {...fieldA11y(`${prefix}-printer`, lineErrors?.printerName?.message)}
            className={INPUT}
          />
        </Field>
        <Field id={`${prefix}-quantity`} label="Số lượng (cuốn)" error={lineErrors?.quantity?.message}>
          <input
            {...register(`lines.${index}.quantity`)}
            {...fieldA11y(`${prefix}-quantity`, lineErrors?.quantity?.message)}
            inputMode="numeric"
            className={`${INPUT} tabular-nums`}
          />
        </Field>
        <Field id={`${prefix}-cost`} label="Giá vốn mỗi cuốn (VNĐ)" error={lineErrors?.unitCost?.message}>
          <input
            {...register(`lines.${index}.unitCost`)}
            {...fieldA11y(`${prefix}-cost`, lineErrors?.unitCost?.message)}
            inputMode="numeric"
            className={`${INPUT} tabular-nums`}
          />
        </Field>
        <Controller
          control={control}
          name={`lines.${index}.receivedAt`}
          render={({ field, fieldState }) => (
            <Field
              id={`${prefix}-received`}
              label="Ngày nhập"
              hint="Quyết định thứ tự xuất kho (lô nhập trước xuất trước)."
              error={fieldState.error?.message}
            >
              <DateInput
                id={`${prefix}-received`}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(fieldState.error)}
                describedBy={fieldA11y(`${prefix}-received`, fieldState.error?.message, true)["aria-describedby"]}
              />
            </Field>
          )}
        />
      </div>
    </li>
  );
}

/** Tổng số cuốn và giá vốn theo các ô đang nhập; ô chưa hợp lệ tính là 0. */
function ReceiptFormTotals({ control }: { control: Control<ReceiptFormValues> }) {
  const lines = useWatch({ control, name: "lines" });
  const totals = receiptTotals(
    lines.map((line) => ({
      quantity: /^\d+$/.test(line.quantity.trim()) ? Number(line.quantity) : 0,
      unitCost: /^\d+$/.test(line.unitCost.trim()) ? Number(line.unitCost) : 0,
    })),
  );
  return (
    <p className="text-muted" aria-live="polite">
      Tổng: <strong className="text-foreground">{totals.quantity.toLocaleString("vi-VN")} cuốn</strong> · giá vốn{" "}
      <strong className="text-foreground">{formatPrice(totals.cost)}</strong>
    </p>
  );
}
