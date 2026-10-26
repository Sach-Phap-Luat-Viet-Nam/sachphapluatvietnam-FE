"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import type { Control, FieldErrors, UseFormGetValues, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Copy, Plus, Trash2 } from "lucide-react";
import { isApiError } from "@slvn/api-client";
import { Button } from "@slvn/ui";
import { formatPrice, vnDateKey } from "@slvn/utils";
import { DateInput } from "@/components/DateInput";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { PageHeader } from "@/components/PageHeader";
import { CARD, FIELD_ERROR, INPUT, TEXTAREA } from "@/components/form-styles";
import { adminErrorMessage } from "@/lib/admin-errors";
import { inventoryKeys } from "./api";
import {
  duplicateReceiptLine,
  emptyReceiptLine,
  nextReceiptLine,
  receiptFieldErrors,
  receiptTotals,
  suggestBatchCode,
  toReceiptBody,
} from "./forms";
import type { ReceiptBody } from "./forms";
import { receiptFormSchema } from "./schemas";
import type { Receipt, ReceiptFormValues } from "./schemas";
import { SkuPicker } from "./SkuPicker";

const ERROR_OVERRIDES = { REFERENCE_NOT_FOUND: "Có SKU không còn tồn tại. Anh/chị chọn lại SKU ở các dòng." };

export interface ReceiptFormProps {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  initialValues: ReceiptFormValues;
  submitLabel: string;
  /** Gọi API lưu (lập mới hoặc sửa nháp). */
  save: (body: ReceiptBody) => Promise<Receipt>;
}

/** Form phiếu nhập nhiều dòng (mỗi dòng là một lô in), dùng chung cho lập phiếu mới và sửa phiếu nháp. */
export function ReceiptForm({
  title,
  description,
  backHref,
  backLabel,
  initialValues,
  submitLabel,
  save,
}: ReceiptFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ReceiptFormValues>({ resolver: zodResolver(receiptFormSchema), defaultValues: initialValues });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  // Thêm hoặc nhân bản dòng xong thì đưa con trỏ vào ô cần nhập tiếp của dòng mới, nhập liền bằng bàn phím.
  const focusAfterAdd = useRef<{ index: number; field: "sku" | "batch" } | null>(null);
  useEffect(() => {
    const target = focusAfterAdd.current;
    if (target) {
      focusAfterAdd.current = null;
      document.getElementById(`line-${target.index}-${target.field}`)?.focus();
    }
  }, [fields.length]);

  const addLine = () => {
    const lines = getValues("lines");
    const last = lines.at(-1);
    focusAfterAdd.current = { index: lines.length, field: "sku" };
    append(last ? nextReceiptLine(last) : emptyReceiptLine(vnDateKey(new Date())));
  };
  const duplicateLine = (index: number) => {
    const line = getValues(`lines.${index}`);
    focusAfterAdd.current = { index: getValues("lines").length, field: "batch" };
    append(duplicateReceiptLine(line));
  };

  const mutation = useMutation({
    mutationFn: save,
    onSuccess: async (receipt) => {
      queryClient.setQueryData(inventoryKeys.receipt(receipt.id), receipt);
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.receiptLists });
      router.push(`/kho/phieu-nhap/${receipt.id}`);
    },
  });

  const onSubmit = async (values: ReceiptFormValues) => {
    try {
      await mutation.mutateAsync(toReceiptBody(values));
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
      <Link href={backHref} className="text-primary flex min-h-11 w-fit items-center gap-2 hover:underline">
        <ArrowLeft size={18} aria-hidden="true" /> {backLabel}
      </Link>
      <PageHeader title={title} description={description} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <ol className="flex flex-col gap-4">
          {fields.map((field, index) => (
            <ReceiptLineFields
              key={field.id}
              index={index}
              control={control}
              register={register}
              errors={errors}
              setValue={setValue}
              getValues={getValues}
              onDuplicate={() => duplicateLine(index)}
              onRemove={fields.length > 1 ? () => remove(index) : undefined}
            />
          ))}
        </ol>
        {errors.lines?.root?.message && (
          <p role="alert" className={FIELD_ERROR}>
            {errors.lines.root.message}
          </p>
        )}
        <Button variant="outline" onClick={addLine} className="w-fit">
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
          submitLabel={submitLabel}
          onCancel={() => router.push(backHref)}
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
  setValue: UseFormSetValue<ReceiptFormValues>;
  getValues: UseFormGetValues<ReceiptFormValues>;
  onDuplicate: () => void;
  onRemove?: () => void;
}

function ReceiptLineFields({
  index,
  control,
  register,
  errors,
  setValue,
  getValues,
  onDuplicate,
  onRemove,
}: ReceiptLineFieldsProps) {
  const lineErrors = errors.lines?.[index];
  const prefix = `line-${index}`;
  return (
    <li className={`${CARD} flex flex-col gap-4 p-5`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Dòng {index + 1}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onDuplicate} aria-label={`Nhân bản dòng ${index + 1}`}>
            <Copy size={16} aria-hidden="true" /> Nhân bản
          </Button>
          {onRemove && (
            <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Xóa dòng ${index + 1}`}>
              <Trash2 size={16} aria-hidden="true" /> Xóa dòng
            </Button>
          )}
        </div>
      </div>
      <Controller
        control={control}
        name={`lines.${index}.sku`}
        render={({ field }) => (
          <Field id={`${prefix}-sku`} label="SKU" error={lineErrors?.sku?.message}>
            <SkuPicker
              id={`${prefix}-sku`}
              value={field.value}
              onChange={(option) => {
                field.onChange(option);
                if (option) {
                  // Gợi ý mã lô theo ngày nhập khi ô còn trống, rồi nhập tiếp ngay bằng bàn phím.
                  const batch = document.getElementById(`${prefix}-batch`);
                  if (!getValues(`lines.${index}.batchCode`)) {
                    setValue(`lines.${index}.batchCode`, suggestBatchCode(getValues(`lines.${index}.receivedAt`)));
                  }
                  batch?.focus();
                  if (batch instanceof HTMLInputElement) batch.select();
                }
              }}
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
