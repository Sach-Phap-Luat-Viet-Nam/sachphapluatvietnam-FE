"use client";

import { useId } from "react";
import { useForm } from "react-hook-form";
import type { UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { CHECKBOX, INPUT, SELECT } from "@/components/form-styles";
import { showServerError } from "@/lib/admin-errors";
import { toSkuCreateBody, toSkuPriceBody } from "./forms";
import type { SkuCreateBody } from "./forms";
import { COVER_TYPE_LABELS } from "./labels";
import type { CoverType } from "./labels";
import { skuCreateFormSchema, skuPriceFormSchema } from "./schemas";
import type { SkuCreateFormValues, SkuPriceFormValues } from "./schemas";

const PRICE_FIELDS = ["listPrice", "salePrice"] as const;
const CREATE_FIELDS = ["skuCode", "coverType", ...PRICE_FIELDS] as const;

interface PriceInputsProps {
  prefix: string;
  /** Kết quả `register(...)` của form đang dùng (form thêm SKU và form sửa giá có kiểu giá trị khác nhau). */
  fields: Record<"listPrice" | "salePrice" | "allowPreorder", UseFormRegisterReturn>;
  errors: { listPrice?: string; salePrice?: string };
}

/** Giá bìa, giá bán, cờ đặt trước: dùng chung cho form thêm và sửa SKU. */
function PriceInputs({ prefix, fields, errors }: PriceInputsProps) {
  const hint = "Số nguyên VNĐ, đã gồm VAT, ví dụ 150000.";
  return (
    <>
      <Field id={`${prefix}-list`} label="Giá bìa" error={errors.listPrice} hint={hint}>
        <input
          type="text"
          inputMode="numeric"
          {...fields.listPrice}
          {...fieldA11y(`${prefix}-list`, errors.listPrice, true)}
          className={INPUT}
        />
      </Field>
      <Field id={`${prefix}-sale`} label="Giá bán" error={errors.salePrice} hint="Không lớn hơn giá bìa.">
        <input
          type="text"
          inputMode="numeric"
          {...fields.salePrice}
          {...fieldA11y(`${prefix}-sale`, errors.salePrice, true)}
          className={INPUT}
        />
      </Field>
      <label className="flex min-h-11 items-center gap-2 md:col-span-2">
        <input type="checkbox" {...fields.allowPreorder} className={CHECKBOX} />
        Cho phép đặt trước <span className="text-muted text-sm">(lưu cờ, website chưa dùng)</span>
      </label>
    </>
  );
}

function priceFields(register: (name: "listPrice" | "salePrice" | "allowPreorder") => UseFormRegisterReturn) {
  return {
    listPrice: register("listPrice"),
    salePrice: register("salePrice"),
    allowPreorder: register("allowPreorder"),
  };
}

export interface SkuPriceFormProps {
  defaultValues: SkuPriceFormValues;
  onSave: (body: ReturnType<typeof toSkuPriceBody>) => Promise<void>;
  onCancel: () => void;
}

/** Sửa giá SKU (mã và loại bìa không đổi được). */
export function SkuPriceForm({ defaultValues, onSave, onCancel }: SkuPriceFormProps) {
  const prefix = useId();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SkuPriceFormValues>({ resolver: zodResolver(skuPriceFormSchema), defaultValues });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        try {
          await onSave(toSkuPriceBody(values));
        } catch (error) {
          showServerError(error, PRICE_FIELDS, setError);
        }
      })}
      className="grid gap-4 md:grid-cols-2"
    >
      <PriceInputs
        prefix={prefix}
        fields={priceFields(register)}
        errors={{ listPrice: errors.listPrice?.message, salePrice: errors.salePrice?.message }}
      />
      <FormActions
        pending={isSubmitting}
        submitLabel="Lưu giá"
        onCancel={onCancel}
        error={errors.root?.server?.message}
        className="md:col-span-2"
      />
    </form>
  );
}

export interface SkuCreateFormProps {
  coverTypes: readonly CoverType[];
  onSave: (body: SkuCreateBody) => Promise<void>;
  onCancel: () => void;
}

/** Thêm SKU cho ấn bản: chỉ chọn được loại bìa chưa có SKU. */
export function SkuCreateForm({ coverTypes, onSave, onCancel }: SkuCreateFormProps) {
  const prefix = useId();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SkuCreateFormValues>({
    resolver: zodResolver(skuCreateFormSchema),
    defaultValues: {
      skuCode: "",
      coverType: coverTypes[0] ?? "paperback",
      listPrice: "",
      salePrice: "",
      allowPreorder: false,
    },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        try {
          await onSave(toSkuCreateBody(values));
        } catch (error) {
          showServerError(error, CREATE_FIELDS, setError);
        }
      })}
      className="grid gap-4 md:grid-cols-2"
    >
      <Field
        id={`${prefix}-code`}
        label="Mã SKU"
        error={errors.skuCode?.message}
        hint="Chữ, số, gạch nối; tự chuyển chữ in hoa. Ví dụ SLVN-BLDS-2026-BM."
      >
        <input
          type="text"
          autoCapitalize="characters"
          {...register("skuCode")}
          {...fieldA11y(`${prefix}-code`, errors.skuCode?.message, true)}
          className={`${INPUT} uppercase`}
        />
      </Field>
      <Field id={`${prefix}-cover`} label="Loại bìa" error={errors.coverType?.message}>
        <select
          {...register("coverType")}
          {...fieldA11y(`${prefix}-cover`, errors.coverType?.message)}
          className={SELECT}
        >
          {coverTypes.map((value) => (
            <option key={value} value={value}>
              {COVER_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
      </Field>
      <PriceInputs
        prefix={prefix}
        fields={priceFields(register)}
        errors={{ listPrice: errors.listPrice?.message, salePrice: errors.salePrice?.message }}
      />
      <FormActions
        pending={isSubmitting}
        submitLabel="Thêm SKU"
        onCancel={onCancel}
        error={errors.root?.server?.message}
        className="md:col-span-2"
      />
    </form>
  );
}
