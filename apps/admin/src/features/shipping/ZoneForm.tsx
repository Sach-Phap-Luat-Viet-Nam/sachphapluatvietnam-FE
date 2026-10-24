"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatPrice } from "@slvn/utils";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { CHECKBOX, INPUT } from "@/components/form-styles";
import { showServerError } from "@/lib/admin-errors";
import { ProvincePicker } from "./ProvincePicker";
import { estimateShippingFee, toZoneBody } from "./shipping-form";
import type { ZoneBody } from "./shipping-form";
import { zoneFormSchema } from "./schemas";
import type { ZoneFormValues } from "./schemas";

const ZONE_FIELDS = [
  "name",
  "isActive",
  "sortOrder",
  "provinces",
  "baseWeightGram",
  "baseFee",
  "stepWeightGram",
  "stepFee",
  "etaMinDays",
  "etaMaxDays",
] as const;

const SECTION_TITLE = "text-lg font-semibold";

export interface ZoneFormProps {
  defaultValues: ZoneFormValues;
  submitLabel: string;
  takenBy: ReadonlyMap<string, string>;
  /** Cảnh báo khi đây là vùng đầu tiên: tỉnh chưa thuộc vùng nào sẽ không còn giao được. */
  firstZone: boolean;
  onSave: (body: ZoneBody) => Promise<void>;
  onCancel: () => void;
}

function NumberField({
  id,
  label,
  hint,
  error,
  registration,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  registration: ReturnType<ReturnType<typeof useForm<ZoneFormValues>>["register"]>;
}) {
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <input
        type="text"
        inputMode="numeric"
        {...registration}
        {...fieldA11y(id, error, Boolean(hint))}
        className={INPUT}
      />
    </Field>
  );
}

/** Form một vùng giao hàng: tên, tỉnh/thành, biểu phí theo trọng lượng, thời gian giao dự kiến. */
export function ZoneForm({ defaultValues, submitLabel, takenBy, firstZone, onSave, onCancel }: ZoneFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ZoneFormValues>({ resolver: zodResolver(zoneFormSchema), defaultValues });
  const [weight, setWeight] = useState("1900");
  const tariff = useWatch({ control });
  const base = Number(tariff.baseWeightGram);
  const step = Number(tariff.stepWeightGram);
  const grams = Number(weight);
  const trial =
    Number.isFinite(grams) && grams > 0 && base > 0 && step > 0
      ? estimateShippingFee(
          {
            baseWeightGram: base,
            baseFee: Number(tariff.baseFee) || 0,
            stepWeightGram: step,
            stepFee: Number(tariff.stepFee) || 0,
          },
          grams,
        )
      : null;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        try {
          await onSave(toZoneBody(values));
        } catch (error) {
          // `SHIPPING_PROVINCE_DUPLICATE` (409): tỉnh trùng hiện ở lỗi chung của form.
          showServerError(error, ZONE_FIELDS, setError);
        }
      })}
      className="flex flex-col gap-6"
    >
      {firstZone && (
        <p role="note" className="bg-warning-surface text-warning rounded-md px-4 py-3 text-sm leading-6">
          <strong>Lưu ý vận hành:</strong> ngay khi tạo vùng đầu tiên, tỉnh nào chưa thuộc vùng nào sẽ không giao được
          (khách thấy “Chưa hỗ trợ giao đến địa chỉ này”). Anh/chị nên tạo đủ các vùng phủ toàn quốc rồi mới bật vùng.
          Có thể tạo vùng với trạng thái tắt trước.
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Field id="zone-name" label="Tên vùng" error={errors.name?.message}>
          <input
            type="text"
            {...register("name")}
            {...fieldA11y("zone-name", errors.name?.message)}
            className={INPUT}
          />
        </Field>
        <NumberField
          id="zone-sort"
          label="Thứ tự hiển thị"
          error={errors.sortOrder?.message}
          registration={register("sortOrder")}
        />
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" {...register("isActive")} className={CHECKBOX} />
          <span className="font-medium">Bật vùng này</span>
        </label>
      </div>

      <fieldset className="border-border flex flex-col gap-3 border-t pt-6">
        <legend className={SECTION_TITLE}>Tỉnh/thành trong vùng</legend>
        <Controller
          control={control}
          name="provinces"
          render={({ field }) => (
            <ProvincePicker
              id="zone-provinces"
              value={field.value}
              onChange={field.onChange}
              takenBy={takenBy}
              invalid={Boolean(errors.provinces)}
              describedBy={errors.provinces ? "zone-provinces-error" : undefined}
            />
          )}
        />
        {errors.provinces?.message && (
          <p id="zone-provinces-error" role="alert" className="text-danger text-sm">
            {errors.provinces.message}
          </p>
        )}
      </fieldset>

      <fieldset className="border-border flex flex-col gap-5 border-t pt-6">
        <legend className={SECTION_TITLE}>Biểu phí theo trọng lượng</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <NumberField
            id="zone-base-weight"
            label="Trọng lượng gói đầu (gram)"
            error={errors.baseWeightGram?.message}
            registration={register("baseWeightGram")}
          />
          <NumberField
            id="zone-base-fee"
            label="Phí gói đầu (₫)"
            error={errors.baseFee?.message}
            registration={register("baseFee")}
          />
          <NumberField
            id="zone-step-weight"
            label="Mỗi bước tiếp theo (gram)"
            error={errors.stepWeightGram?.message}
            registration={register("stepWeightGram")}
          />
          <NumberField
            id="zone-step-fee"
            label="Phụ phí mỗi bước (₫)"
            hint="Làm tròn lên: có phần lẻ cũng tính trọn một bước."
            error={errors.stepFee?.message}
            registration={register("stepFee")}
          />
        </div>
        <div className="bg-surface flex flex-wrap items-end gap-4 rounded-md px-4 py-3">
          <Field id="zone-trial" label="Tính thử: trọng lượng đơn (gram)" className="w-56">
            <input
              id="zone-trial"
              type="text"
              inputMode="numeric"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              className={INPUT}
            />
          </Field>
          <p aria-live="polite" className="pb-3 font-medium">
            {trial === null ? "Nhập trọng lượng và biểu phí hợp lệ" : `Phí minh họa: ${formatPrice(trial)}`}
          </p>
          <p className="text-muted w-full text-sm leading-6">
            Chỉ để minh họa biểu phí. Phí thật do hệ thống tính khi khách đặt hàng.
          </p>
        </div>
      </fieldset>

      <fieldset className="border-border flex flex-col gap-5 border-t pt-6">
        <legend className={SECTION_TITLE}>Thời gian giao dự kiến</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <NumberField
            id="zone-eta-min"
            label="Ít nhất (ngày)"
            error={errors.etaMinDays?.message}
            registration={register("etaMinDays")}
          />
          <NumberField
            id="zone-eta-max"
            label="Nhiều nhất (ngày)"
            hint="Không quá 60 ngày."
            error={errors.etaMaxDays?.message}
            registration={register("etaMaxDays")}
          />
        </div>
      </fieldset>

      <FormActions
        pending={isSubmitting}
        submitLabel={submitLabel}
        onCancel={onCancel}
        error={errors.root?.server?.message}
      />
    </form>
  );
}
